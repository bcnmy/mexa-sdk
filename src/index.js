const axios = require("axios");
const Promise = require('promise');
const txDecoder = require('ethereum-tx-decoder');
const {config, RESPONSE_CODES, EVENTS, BICONOMY_RESPONSE_CODES, STATUS} = require('./config');
const DEFAULT_PAYLOAD_ID = "99999999";
const Web3 = require('web3');
const baseURL = config.baseURL;
const userLoginPath = config.userLoginPath;
const withdrawFundsUrl = config.withdrawFundsUrl;
const getUserContractPath = config.getUserContractPath;
const JSON_RPC_VERSION = config.JSON_RPC_VERSION;
const USER_ACCOUNT = config.USER_ACCOUNT;
const USER_CONTRACT = config.USER_CONTRACT;
const NATIVE_META_TX_URL = config.nativeMetaTxUrl;

let decoderMap = {}, smartContractMap = {};
let web3;
const events = require('events');
var eventEmitter = new events.EventEmitter();
let loginInterval;

let domainType, metaInfoType, relayerPaymentType, metaTransactionType;

let domainData = {
    name: config.eip712DomainName,
    version: config.eip712SigVersion,
    verifyingContract: config.eip712VerifyingContract
};

// EIP712 format data for login
let loginDomainType, loginMessageType, loginDomainData;

function Biconomy(provider, options) {
	_validate(options);
	this.status = STATUS.INIT;
	this.dappId = options.dappId;
	this.apiKey = options.apiKey;
	this.isLogin = false;
	this.dappAPIMap = {};
	this.strictMode = options.strictMode || false;
	this.providerId = options.providerId || 0;
	this.readViaContract = options.readViaContract || false;
	this.READY = STATUS.BICONOMY_READY;
	this.LOGIN_CONFIRMATION = EVENTS.LOGIN_CONFIRMATION;
	this.ERROR = EVENTS.BICONOMY_ERROR;
	this.pendingLoginTransactions = {};
	if(options.debug) {
		config.logsEnabled = true;
	}
	_init(this.dappId, this.apiKey, this);

	if(provider) {
		web3 = new Web3(provider);
		if(options.defaultAccount) {
			web3.eth.defaultAccount = options.defaultAccount;
		}
		const proto = Object.getPrototypeOf(provider)
		const keys = Object.getOwnPropertyNames(proto)

		for(var i=0;i<keys.length;i++){
			this[keys[i]] = provider[keys[i]];
		}

		for(var key in provider) {
			if(!this[key]) {
				this[key] = provider[key];
			}
		}

		this.providerSend = provider.send || provider.sendAsync;
		this.send = function(payload, cb) {
			if(payload.method == 'eth_sendTransaction') {

				handleSendTransaction(this, payload, (error, result) => {
					let response = _createJsonRpcResponse(payload, error, result);
					if(cb)  {
						cb(error, response);
					}
				});

			} else if(payload.method == 'eth_sendRawTransaction') {

				sendSignedTransaction(this, payload, (error, result) => {
					let response = _createJsonRpcResponse(payload, error, result);
					if(cb) {
						cb(error, response);
					}
				});

			} else if(payload.method == 'eth_call') {
				let userContract = getFromStorage(USER_CONTRACT);
				if(this.readViaContract && this.isLogin && userContract) {
					if(payload && payload.params && payload.params[0]) {
						payload.params[0].from = userContract;
					}
				}
				web3.currentProvider.send(payload, cb);
			} else {
				web3.currentProvider.send(payload, cb);
			}
		};
		this.sendAsync = this.send;
	} else {
		throw new Error('Please pass a provider to Biconomy.');
	}
}

/**
 * This method returns an EIP712 formatted data ready to be signed
 * that will be used in login method/API.
 * LoginMessageType [
 * 	 { name: "userAddress", type: "address"},
 *   { name: "nonce", type: "uint256"},
 *   { name: "providerId", type: "string"}
 * ]
 */
Biconomy.prototype.getLoginMessageToSign = function(signer) {
	let engine = this;
	return new Promise(async (resolve, reject) => {
		try {
			if(!signer || typeof signer != 'string') {
				let response = formatMessage(RESPONSE_CODES.INVALID_DATA, "signer parameter is mandatory and should be of type 'string'");
				return reject(response);
			}
			let message = {};
			message.userAddress = signer.toLowerCase();
			message.providerId = engine.providerId
			let nonce = await _getUserNonce(signer, this);
			if(!nonce) {
				nonce = 0;
			}
			message.nonce = nonce;

			const dataToSign = {
				types: {
					EIP712Domain: loginDomainType,
					LoginMessage: loginMessageType
				},
				domain: loginDomainData,
				primaryType: "LoginMessage",
				message: message
			};
			resolve(dataToSign);
		} catch(error) {
			reject(error);
		}
	});
}

/**
 * This method returns an EIP712 formatted data ready to be signed
 * that will be used while sending the transaction using web3.eth.sendSignedTransaction
 * Returned data structure types
 * RelayerPaymentType [
 *   { name: "token", type: "address"},
 *   { name: "amount", type: "uint256"}
 * ]

 * MetaTransactionType = [
 *	{ name: "from", type: "address"},
 *	{ name: "to", type: "address"},
 *	{ name: "data", type: "bytes"},
 *	{ name: "batchId", type: "uint256"},
 *	{ name: "nonce", type: "uint256"},
 *	{ name: "expiry", type: "uint256"},
 *	{ name: "txGas", type: "uint256"},
 *	{ name: "baseGas", type: "uint256"},
 *	{ name: "value", type: "uint256"},
 *  { name: "metaInfo", type: "MetaInfo"},
 *  { name: "relayerPayment", type: "RelayerPayment"}
 * ]
 */
Biconomy.prototype.getUserMessageToSign = function(rawTransaction, cb) {
	let engine = this;
	return new Promise(async (resolve, reject)=>{

		if(rawTransaction) {
			let decodedTx = txDecoder.decodeTx(rawTransaction);
			if(decodedTx.to && decodedTx.data && decodedTx.value) {
				const methodInfo = decodeMethod(decodedTx.to.toLowerCase(), decodedTx.data);
				if(!methodInfo) {
					let error = formatMessage(RESPONSE_CODES.DASHBOARD_DATA_MISMATCH,
						`Smart Contract address registered on dashboard is different than what is sent(${decodedTx.to}) in current transaction`);
					if(cb) cb(error);
					return reject(error);
				}
				let methodName = methodInfo.name;
				let api = engine.dappAPIMap[methodName];
				if(!api) {
					_logMessage(`API not found for method ${methodName}`);

				}
				_logMessage('API found');
				let params = methodInfo.params;
				let paramArray = [];
				for(let i = 0; i < params.length; i++) {
					paramArray.push(_getParamValue(params[i]));
				}

				let account = web3.eth.accounts.recoverTransaction(rawTransaction);
				_logMessage(`signer is ${account}`);
				if(!account) {
					let error = formatMessage(RESPONSE_CODES.ERROR_RESPONSE ,`Not able to get user account from signed transaction`);
					return end(error);
				}

				let userContractWallet = await _getUserContractWallet(engine, account);
				_logMessage(`User contract wallet ${userContractWallet}`);

				if(!userContractWallet) {
					let error = formatMessage(RESPONSE_CODES.USER_CONTRACT_NOT_FOUND ,`User contract wallet not found`);
					if(cb) cb(error);
					return reject(error);
				}

				let metaInfo = {};
				metaInfo.contractWallet =  userContractWallet;

				let relayerPayment = {};
				relayerPayment.token = config.DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS;
				relayerPayment.amount = config.DEFAULT_RELAYER_PAYMENT_AMOUNT;

				let message = {};
				message.from = account;
				message.to = decodedTx.to.toLowerCase();
				message.data = decodedTx.data;
				message.batchId = config.NONCE_BATCH_ID;
				let nonce = await _getUserContractNonce(account,engine);
				message.nonce = parseInt(nonce);
				message.value = web3.utils.toHex(decodedTx.value);
				message.txGas = decodedTx.gasLimit.toString()?decodedTx.gasLimit.toString():0;
				message.expiry = config.EXPIRY;
				message.baseGas = config.BASE_GAS;
				message.metaInfo = metaInfo;
				message.relayerPayment = relayerPayment;

				const dataToSign = {
					types: {
						EIP712Domain: domainType,
						MetaInfo: metaInfoType,
						RelayerPayment: relayerPaymentType,
						MetaTransaction: metaTransactionType
					},
					domain: domainData,
					primaryType: "MetaTransaction",
					message: message
				};
				if(cb) cb(null, dataToSign);
				return resolve(dataToSign);
			} else {
				let error = formatMessage(RESPONSE_CODES.BICONOMY_NOT_INITIALIZED ,
					`Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard`);
				if(cb) cb(error);
				return reject(error);
			}
		}
	});
}

/**
 * Method used to listen to events emitted from the SDK
 */
Biconomy.prototype.onEvent = function(type, callback) {
	if(type == this.READY || type == this.ERROR || type == this.LOGIN_CONFIRMATION) {
		eventEmitter.on(type, callback);
		return this;
	} else {
		throw formatMessage(RESPONSE_CODES.EVENT_NOT_SUPPORTED, `${type} event is not supported.`);
	}
}

/**
 * Create a JSON RPC response from the given error and result parameter.
 **/
function _createJsonRpcResponse(payload, error, result) {
	let response = {};
	response.id = payload.id;
	response.jsonrpc = JSON_RPC_VERSION;
	if(error) {
		response.error = error;
	} else if(result.error) {
		response.error = result.error;
	} else if(web3.utils.isHex(result)) {
		response.result = result;
	} else {
		response = result;
	}
	return response;
}

function decodeMethod(to, data) {
	if(to && data && decoderMap[to]) {
		return decoderMap[to].decodeMethod(data);
	}
	return;
}

/**
 * Method used to handle transaction initiated using web3.eth.sendSignedTransaction method
 * It extracts rawTransaction from payload and decode it to get required information like from, to,
 * data, gasLimit to create the payload for biconomy meta transaction API.
 * In case of Native meta transaction, payload just contains rawTransaction
 * In case of contract based meta transaction, payload contains rawTransaction and signature wrapped
 * in a json object.
 *
 * @param {Object} engine Reference to this SDK instance
 * @param {Object} payload Payload data
 * @param {Function} end Callback function with error as first argument
 */
async function sendSignedTransaction(engine, payload, end) {

	if(payload && payload.params[0]) {
		let data = payload.params[0];
		let rawTransaction, signature;

		if(typeof data == "string") {
			// Here user send the rawTransaction in the payload directly. Probably the case of native meta transaction
			rawTransaction = data;
		} else if(typeof data == "object") {
			// Here user wrapped raw Transaction in json object along with signature
			signature = data.signature;
			rawTransaction = data.rawTransaction;
		}

		if(rawTransaction) {
			let decodedTx = txDecoder.decodeTx(rawTransaction);

			if(decodedTx.to && decodedTx.data && decodedTx.value) {
				const methodInfo = decodeMethod(decodedTx.to.toLowerCase(), decodedTx.data);
				if(!methodInfo) {
					let error = formatMessage(RESPONSE_CODES.DASHBOARD_DATA_MISMATCH,
						`Smart Contract address registered on dashboard is different than what is sent(${decodedTx.to}) in current transaction`);
					return end(error);
				}
				let methodName = methodInfo.name;
				let api = engine.dappAPIMap[methodName];
				if(!api) {
					_logMessage(`API not found for method ${methodName}`);
					_logMessage(`Strict mode ${engine.strictMode}`);
					if(engine.strictMode) {
						let error = formatMessage(RESPONSE_CODES.API_NOT_FOUND,
							`Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`);
						return end(error, null);
					} else {
						_logMessage(`Falling back to default provider as strict mode is false in biconomy`);
						return engine.providerSend(rawTransaction, end);
					}
				}
				_logMessage('API found');
				let params = methodInfo.params;
				let paramArray = [];
				for(let i = 0; i < params.length; i++) {
					paramArray.push(_getParamValue(params[i]));
				}

				let account = web3.eth.accounts.recoverTransaction(rawTransaction);
				_logMessage(`signer is ${account}`);
				if(!account) {
					let error = formatMessage(RESPONSE_CODES.ERROR_RESPONSE ,`Not able to get user account from signed transaction`);
					return end(error);
				}
				if(api.url == NATIVE_META_TX_URL) {
					let data = {};
					data.userAddress = account;
					data.apiId = api.id;
					data.params = paramArray;
					data.gasLimit = decodedTx.gasLimit.toString();
					data.gasPrice = decodedTx.gasPrice.toString();
					_sendTransaction(engine, account, api, data, end);
				}
				else{
					if(!engine.isLogin){
						let error = {};
						error.message = 'User not logged in to biconomy';
						error.code = RESPONSE_CODES.USER_NOT_LOGGED_IN;
						return end(error);
					} else {
						if(signature ) {

							let relayerPayment = {};
							relayerPayment.token = config.DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS;
							relayerPayment.amount = config.DEFAULT_RELAYER_PAYMENT_AMOUNT;

							let data = {};
							data.rawTx = rawTransaction;
							data.signature = signature;
							data.to = decodedTx.to.toLowerCase();
							data.from = account;
							data.apiId = api.id;
							data.data = decodedTx.data;
							data.value = web3.utils.toHex(decodedTx.value)
							data.gasLimit = decodedTx.gasLimit.toString();
							data.gasPrice = decodedTx.gasPrice.toString();
							data.nonceBatchId = config.NONCE_BATCH_ID;
							data.expiry = config.EXPIRY;
							data.baseGas = config.BASE_GAS;
							data.relayerPayment = {
								token: relayerPayment.token,
								amount: relayerPayment.amount
							};
							_sendTransaction(engine, account, api, data, end);
						} else {
							let error = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD ,
								`Invalid payload data ${JSON.stringify(payload.params[0])}. message and signature are required in param object`);
							eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
							end(error);
						}
					}
				}
			} else {
				let error = formatMessage(RESPONSE_CODES.BICONOMY_NOT_INITIALIZED ,
					`Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard`);
				eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
				end(error);
			}
		} else {
			let error = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD ,
				`Invalid payload data ${JSON.stringify(payload.params[0])}.rawTransaction is required in param object`);
			eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
			end(error);
		}
	} else {
		let error = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD ,
			`Invalid payload data ${JSON.stringify(payload.params[0])}. Non empty Array expected in params key`);
		eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
		end(error);
	}
}

/**
 * Method to withdraw ether from use contract wallets.
 * It takes the receiverAddress and withdraw amount in wei.
 * An optional callback parameter can also be given that has first parameter as error and
 * second parameter as result containing withdraw transaction hash.
 *
 * Returns a promise that resolves to result object containing withdraw transaction hash.
 */
Biconomy.prototype.withdrawFunds = function(receiverAddress, withdrawAmount, cb) {
	let engine = this;
	return new Promise(async (resolve, reject)=>{
		let account = await _getUserAccount(this);
		let nonce = await _getUserContractNonce(account,this);
		let userContractWallet = await _getUserContractWallet(engine, account);
		if(!userContractWallet) {
			let error = formatMessage(RESPONSE_CODES.USER_CONTRACT_NOT_FOUND ,`User contract wallet not found`);
			eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
			if(cb) cb(error);
			return reject(error);
		}
		let metaInfo = {};
		metaInfo.contractWallet =  userContractWallet;

		let relayerPayment = {};
		relayerPayment.token = config.DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS;
		relayerPayment.amount = config.DEFAULT_RELAYER_PAYMENT_AMOUNT;

		let message = {};
		message.from = account;
		message.to = receiverAddress;
		message.data = "0x0";
		message.batchId = config.NONCE_BATCH_ID;
		message.nonce = parseInt(nonce);
		message.value = web3.utils.toHex(withdrawAmount || 0);
		message.txGas = 0;
		message.expiry = config.EXPIRY;
		message.baseGas = config.BASE_GAS;
		message.metaInfo = metaInfo;
		message.relayerPayment = relayerPayment;
		const dataToSign = JSON.stringify({
			types: {
				EIP712Domain: domainType,
				MetaInfo: metaInfoType,
				RelayerPayment: relayerPaymentType,
				MetaTransaction: metaTransactionType
			},
			domain: domainData,
			primaryType: "MetaTransaction",
			message: message
		});

		try{
			web3.currentProvider.send({
				jsonrpc: JSON_RPC_VERSION,
				id: DEFAULT_PAYLOAD_ID,
				method: config.signTypedV3Method,
				params: [account, dataToSign]
			}, function(error, response) {
				_logMessage(`User signature for payload id ${DEFAULT_PAYLOAD_ID} is ${response.result}`);
				if(error) {
					if(cb){
						cb(error);
					}
					reject(error);
				} else if(response && response.error) {
					if(cb) cb(response.error);
					reject(response.error);
				} else if(response && response.result) {
					let data = {};
					data.signature = response.result;
					data.to = receiverAddress;
					data.value = web3.utils.toHex(withdrawAmount) || 0;
					data.from = account;
					data.data = "0x0";
					data.expiry = config.EXPIRY;
					data.baseGas = config.BASE_GAS;
					data.gasLimit = 0;
					data.nonceBatchId = config.NONCE_BATCH_ID;
					data.relayerPayment = relayerPayment;

					axios.defaults.headers.common["x-api-key"] = engine.apiKey;
					axios.post(`${baseURL}${withdrawFundsUrl}`, data)
					.then(function(response) {
						if(response && response.data) {
							if(cb) cb(null, response.data);
							let result = formatMessage(RESPONSE_CODES.SUCCESS_RESPONSE,response.data.log);
							result.txHash = response.data.txHash;
							resolve(result);
						} else {
							let error = formatMessage(RESPONSE_CODES.ERROR_RESPONSE, `Unable to get response for api ${withdrawFundsUrl}`);
							if(cb) cb(error);
							reject(error);
						}
					})
					.catch(function(error) {
						if(cb) cb(formatMessage(error.flag,error.log));
						reject(formatMessage(error.flag,error.log));
					});
				}
			});
		} catch(error) {
			if(cb) cb(error);
			reject(error);
		}
	});
}
/**
 * Function decodes the parameter in payload and gets the user signature using eth_signTypedData_v3
 * method and send the request to biconomy for processing and call the callback method 'end'
 * with transaction hash.
 *
 * This is an internal function that is called while intercepting eth_sendTransaction RPC method call.
 **/
async function handleSendTransaction(engine, payload, end) {
	_logMessage('Handle transaction with payload');
	_logMessage(payload);
	if(payload.params && payload.params[0] && payload.params[0].to) {
		if(decoderMap[payload.params[0].to.toLowerCase()]) {
			const methodInfo = decodeMethod(payload.params[0].to.toLowerCase(), payload.params[0].data);
			let methodName = methodInfo.name;
			let api = engine.dappAPIMap[methodName];
			let gasPrice = payload.params[0].gasPrice;
			let gasLimit = payload.params[0].gas;
			_logMessage(api);

			if(!api) {
				_logMessage(`API not found for method ${methodName}`);
				_logMessage(`Strict mode ${engine.strictMode}`);
				if(engine.strictMode) {
					let error = {};
					error.code = RESPONSE_CODES.API_NOT_FOUND;
					error.message = `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`;
					return end(error, null);
				} else {
					_logMessage(`Falling back to default provider as strict mode is false in biconomy`);
					return engine.providerSend(payload, end);
				}
			}
			console.info('API found');
			let params = methodInfo.params;
			let paramArray = [];
			for(let i = 0; i < params.length; i++) {
				paramArray.push(_getParamValue(params[i]));
			}

			console.info("Getting user account");
			let account = await _getUserAccount(engine, payload);
			if(!account) {
				return end(`Not able to get user account`);
			}
			console.info(`User account fetched`);
			if(api.url == NATIVE_META_TX_URL) {
				let data = {};
				data.userAddress = account;
				data.apiId = api.id;
				data.params = paramArray;
				data.gasPrice = gasPrice;
				data.gasLimit = gasLimit;
				_sendTransaction(engine, account, api, data, end);
			}
			else{
				if(engine.isLogin) {
					let nonce = await _getUserContractNonce(account, engine);
					if(!nonce) {
						let error = formatMessage(RESPONSE_CODES.USER_ACCOUNT_NOT_FOUND ,`User is not a registered biconomy user`);
						eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
						end(error);
					}
					let userContractWallet = await _getUserContractWallet(engine, account);

					if(!userContractWallet) {
						let error = formatMessage(RESPONSE_CODES.USER_CONTRACT_NOT_FOUND ,`User contract wallet not found`);
						eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
						return end(error);
					}

					// Check if gas limit is present, it not calculate gas limit
					if(!gasLimit || parseInt(gasLimit) == 0) {
						let contractABI = smartContractMap[payload.params[0].to.toLowerCase()];
						if(contractABI) {
							let contract = new web3.eth.Contract(JSON.parse(contractABI), payload.params[0].to.toLowerCase());
							gasLimit = await contract.methods[methodName].apply(null, paramArray).estimateGas({from: userContractWallet});
						}
					}
					let metaInfo = {};
					metaInfo.contractWallet =  userContractWallet;

					let relayerPayment = {};
					relayerPayment.token = config.DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS;
					relayerPayment.amount = config.DEFAULT_RELAYER_PAYMENT_AMOUNT;

					let message = {};
					message.from = account;
					message.to = payload.params[0].to.toLowerCase();
					message.data = payload.params[0].data;
					message.batchId = config.NONCE_BATCH_ID;
					message.nonce = parseInt(nonce);
					message.value = web3.utils.toHex(payload.params[0].value || 0);
					message.txGas = gasLimit?gasLimit:0;
					message.expiry = config.EXPIRY;
					message.baseGas = config.BASE_GAS;
					message.metaInfo = metaInfo;
					message.relayerPayment = relayerPayment;

					const dataToSign = JSON.stringify({
						types: {
							EIP712Domain: domainType,
							MetaInfo: metaInfoType,
							RelayerPayment: relayerPaymentType,
							MetaTransaction: metaTransactionType
						},
						domain: domainData,
						primaryType: "MetaTransaction",
						message: message
					});
					console.debug(dataToSign);
					engine.send({
						jsonrpc: JSON_RPC_VERSION,
						id: payload.id,
						method: config.signTypedV3Method,
						params: [account, dataToSign]
					}, function(error, response) {
						console.info(`User signature for payload id ${payload.id} is ${response.result}`);
						if(error) {
							end(error);
						} else if(response && response.error) {
							end(response.error);
						} else if(response && response.result) {
							let data = {};
							data.signature = response.result;
							data.from = account;
							data.to = payload.params[0].to.toLowerCase();
							data.apiId = api.id;
							data.dappId = engine.dappId;

							data.data = payload.params[0].data;
							data.nonceBatchId = config.NONCE_BATCH_ID;
							data.expiry = config.EXPIRY;
							data.baseGas = config.BASE_GAS;
							data.userContract = userContractWallet;
							data.value = web3.utils.toHex(payload.params[0].value || 0);
							data.gasPrice = gasPrice;
							data.gasLimit = gasLimit?gasLimit:0;
							data.relayerPayment = {
								token: relayerPayment.token,
								amount: relayerPayment.amount
							};
							_sendTransaction(engine, account, api, data, end);
						} else {
							end();
						}
					});
				} else {
					let error = {};
					error.message = 'User not logged in to biconomy';
					error.code = RESPONSE_CODES.USER_NOT_LOGGED_IN;
					return end(error);
				}
			}
		} else {
			let error = formatMessage(RESPONSE_CODES.BICONOMY_NOT_INITIALIZED ,
				`Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard`);
			eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
			end(error);
		}
	} else {
		let error = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD ,
			`Invalid payload data ${JSON.stringify(payload)}. Expecting params key to be an array with first element having a 'to' property`);
		eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
		end(error);
	}
}

/**
 * It fetches the user nonce used during login.
 *
 * @param {string} address User address whole nonce is requested
 * @param {object} engine Reference to Mexa object.
 */
async function _getUserNonce(address, engine) {
	try {
		let getNonceAPI = `${baseURL}/api/${config.version}/dapp-user/getNonce?signer=${address}`;
		axios.defaults.headers.common["x-api-key"] = engine.apiKey;
		let response = await axios.get(getNonceAPI);
		if(response && response.status == 200 && response.data) {
			return response.data.nonce;
		}
		return;
	} catch(error) {
		if(error.response.status == 404) {
			return 0;
		}
		return;
	}
}

/**
 * It query biconomy server for user contract nonce.
 *
 * @param {string} address user address whole nonce is requested
 * @param {object} engine Reference to mexa object
 */
async function _getUserContractNonce(address, engine) {
	try {
		let getNonceAPI = `${baseURL}/api/${config.version2}/dapp-user/getContractNonce?signer=${address}`;
		axios.defaults.headers.common["x-api-key"] = engine.apiKey;
		let response = await axios.get(getNonceAPI);
		if(response && response.status == 200 && response.data) {
			return response.data.nonce;
		}
		return;
	} catch(error) {
		_logMessage(error);
		return;
	}
}


// On getting smart contract data get the API data also
eventEmitter.on(EVENTS.SMART_CONTRACT_DATA_READY, (dappId, engine)=>{
	// Get DApp API information from Database
    let getAPIInfoAPI = `${baseURL}/api/${config.version}/meta-api?dappId=${dappId}`;
	axios.get(getAPIInfoAPI).then(function(response) {
		if(response && response.data && response.data.listApis) {
			let apiList = response.data.listApis;
			for(let i=0;i<apiList.length;i++) {
				engine.dappAPIMap[apiList[i].method] = apiList[i];
			}
			eventEmitter.emit(EVENTS.DAPP_API_DATA_READY, engine);
		}
	}).catch(function(error) {
      console.error(error);
    });
});

eventEmitter.on(EVENTS.DAPP_API_DATA_READY, (engine)=>{
	engine.status = STATUS.BICONOMY_READY;
	eventEmitter.emit(STATUS.BICONOMY_READY);
});

/**
 * Get user account from current provider using eth_accounts method.
 **/
function _getUserAccount(engine, payload, cb) {
	if(engine) {
		let id = DEFAULT_PAYLOAD_ID;
		if(payload) {
			id = payload.id;
		}
		if(cb) {
			web3.currentProvider.send({jsonrpc: JSON_RPC_VERSION, id: id, method: 'eth_accounts', params: []}, (error, response)=>{
				if(response && response.result && response.result.length == 0
					&& web3.eth.defaultAccount && web3.eth.defaultAccount != "") {
					response.result.push(web3.eth.defaultAccount);
					cb(error, response);
				} else {
					cb(error, response);
				}
			});
		} else {
			return new Promise(function(resolve, reject) {
				web3.currentProvider.send({jsonrpc: JSON_RPC_VERSION, id: id, method: 'eth_accounts', params: []}, function(error, res){
					if(error) {
						reject(error);
					} else if(!res.result) {
						reject(`Invalid response ${res}`);
					} else if(res.result && res.result.length == 0
						&& web3.eth.defaultAccount && web3.eth.defaultAccount != "") {
						resolve(web3.eth.defaultAccount);
					} else {
						resolve(res.result[0]);
					}
				});
			});
		}
	}
}

/**
 * Validate parameters passed to biconomy object. Dapp id and api key are mandatory.
 **/
function _validate(options) {
	if(!options) {
		throw new Error(`Options object needs to be passed to Biconomy Object with dappId and apiKey mandatory keys`);
	}
	if(!options.dappId || !options.apiKey) {
		throw new Error(`dappId and apiKey are required in options object when creating Biconomy object`);
	}
}

/**
 * Get paramter value from param object based on its type.
 **/
function _getParamValue(paramObj) {
	let value;
	if(paramObj) {
		let type = paramObj.type;
		switch (type) {
			case (type.match(/^uint/) || type.match(/^int/) || {}).input:
				value = scientificToDecimal(parseInt(paramObj.value));
				value = web3.utils.toHex(value);
				break;
			case 'string':
				if(typeof paramObj.value === "object"){
					value = paramObj.value.toString();
				}
				else {
					value = paramObj.value;
				}
				break;

			default:
				value = paramObj.value;
				break;
		}
	}
	return value;
}

/**
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param engine Object representing biconomy provider engine
 * @param account User selected account on current wallet
 * @param api API object got from biconomy server
 * @param data Data to be sent to biconomy server having transaction data
 * @param cb Callback method to be called to pass result or send error
 **/
function _sendTransaction(engine, account, api, data, cb) {
	if(engine && account && api && data) {
		let url = api.url;
		axios
	      .post(`${baseURL}${url}`, data)
	      .then(function(response) {
			if(response && response.data) {
				const result = response.data;
				_logMessage(result);
				if(result.flag && result.flag != BICONOMY_RESPONSE_CODES.ACTION_COMPLETE
					&& result.flag != BICONOMY_RESPONSE_CODES.SUCCESS) {
					let error = {};
					error.code = result.flag;
					if(result.flag == BICONOMY_RESPONSE_CODES.USER_CONTRACT_NOT_FOUND) {
						error.code = RESPONSE_CODES.USER_CONTRACT_NOT_FOUND;
					}
					error.message = result.log;
					if(cb) cb(error);
				} else {
					if(cb) cb(null, result.txHash);
				}
			} else {
				_logMessage(response);
				if(cb) cb(formatMessage(RESPONSE_CODES.ERROR_RESPONSE, `Invalid response from api ${url}`));
			}
	      })
	      .catch(function(error) {
	        _logMessage(error);
	        if(cb) cb(error);
	      });
	} else {
		_logMessage(`Invalid arguments, provider: ${engine} account: ${account} api: ${api} data: ${data}`);
		if(cb) cb(`Invalid arguments, provider: ${engine} account: ${account} api: ${api} data: ${data}`, null);
	}
}

/**
 * Function to initialize the biconomy object with DApp information.
 * It fetches the dapp's smart contract from biconomy database and initialize the decoders for each smart
 * contract which will be used to decode information during function calls.
 * @param dappId Id for dapp whose information is to be fetched
 * @param apiKey API key used to authenticate the request at biconomy server
 * @param _this object representing biconomy provider
 **/
async function _init(dappId, apiKey, engine) {
	try {
		// Check current network id and dapp network id registered on dashboard
		let getDappAPI = `${baseURL}/api/${config.version}/dapp?dappId=${dappId}`;
		axios.defaults.headers.common["x-api-key"] = apiKey;
		axios.get(getDappAPI).then(function(response) {
			let dappResponse = response.data;
			if(dappResponse && dappResponse.dapp) {
				let dappNetworkId = dappResponse.dapp.networkId;
				_logMessage(`Network id corresponding to dapp id ${dappId} is ${dappNetworkId}`);
				web3.currentProvider.send({
					jsonrpc: JSON_RPC_VERSION,
					id: '102',
					method: 'net_version',
					params: []
				}, function(error, networkResponse){
					if(error || (networkResponse && networkResponse.error)) {
						return eventEmitter.emit(EVENTS.BICONOMY_ERROR,
							formatMessage(RESPONSE_CODES.NETWORK_ID_NOT_FOUND , "Could not get network version"), error || networkResponse.error);
					} else {
						let providerNetworkId = networkResponse.result;
						_logMessage(`Current provider network id: ${providerNetworkId}`);
						if(providerNetworkId != dappNetworkId) {
							return eventEmitter.emit(EVENTS.BICONOMY_ERROR,
								formatMessage(RESPONSE_CODES.NETWORK_ID_MISMATCH,
								`Current networkId ${providerNetworkId} is different from dapp network id registered on mexa dashboard ${dappNetworkId}`));
						} else {
							domainData.chainId = providerNetworkId;
							axios.get(`${baseURL}/api/${config.version2}/meta-tx/systemInfo?networkId=${providerNetworkId}`)
							.then(signatureTypesResult => {
								if(signatureTypesResult && signatureTypesResult.data) {
									let systemInfo = signatureTypesResult.data;
									domainType = systemInfo.domainType;
									metaInfoType = systemInfo.metaInfoType;
									relayerPaymentType = systemInfo.relayerPaymentType;
									metaTransactionType = systemInfo.metaTransactionType;
									loginDomainType = systemInfo.loginDomainType;
									loginMessageType = systemInfo.loginMessageType;
									loginDomainData = systemInfo.loginDomainData;

									if(systemInfo.relayHubAddress) {
										domainData.verifyingContract = systemInfo.relayHubAddress;
									}
								} else {
									return eventEmitter.emit(EVENTS.BICONOMY_ERROR,
										formatMessage(RESPONSE_CODES.INVALID_DATA ,
											"Could not get signature types from server. Contact Biconomy Team"));
								}
								// Get dapps smart contract data from biconomy servers
								let getDAppInfoAPI = `${baseURL}/api/${config.version}/smart-contract?dappId=${dappId}`;
								axios.get(getDAppInfoAPI).then(function(response) {
									let result = response.data;
									if(!result && result.flag != 143) {
										return eventEmitter.emit(EVENTS.BICONOMY_ERROR,
											formatMessage(RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND ,
												`Error getting smart contract for dappId ${dappId}`));
									}
									let smartContractList = result.smartContracts;
									if(smartContractList && smartContractList.length > 0) {
										smartContractList.forEach(contract => {
											let abiDecoder = require('abi-decoder');
											abiDecoder.addABI(JSON.parse(contract.abi));
											decoderMap[contract.address.toLowerCase()] = abiDecoder;
											smartContractMap[contract.address.toLowerCase()] = contract.abi;
										});

										let userLocalAccount = getFromStorage(USER_ACCOUNT);
										let userLocalContract = getFromStorage(USER_CONTRACT);
										if(userLocalContract && userLocalAccount) {
											_getUserAccount(engine, undefined, (error, response) => {
												if(error || !response || response.error) {
													return eventEmitter.emit(EVENTS.BICONOMY_ERROR,
														formatMessage(RESPONSE_CODES.USER_ACCOUNT_NOT_FOUND ,
															"Could not get user account"));
												}
												let account = response.result[0];
												_getUserContractWallet(engine, account, (error, userContract) => {
													if(userContract && account && account.toUpperCase() == userLocalAccount.toUpperCase()
														&& userContract.toUpperCase() == userLocalContract.toUpperCase()) {
														engine.isLogin = true;
														_logMessage('Biconomy user login set to true');
													}
													eventEmitter.emit(EVENTS.SMART_CONTRACT_DATA_READY, dappId, engine);
												});
											});
										} else {
											eventEmitter.emit(EVENTS.SMART_CONTRACT_DATA_READY, dappId, engine);
										}
									} else {
										engine.status = STATUS.NO_DATA;
										eventEmitter.emit(EVENTS.BICONOMY_ERROR,
											formatMessage(RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND ,
												`No smart contract registered for dappId ${dappId} on Mexa Dashboard`));
									}
								})
								.catch(function(error) {
									eventEmitter.emit(EVENTS.BICONOMY_ERROR,
										formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Error while initializing Biconomy"), error);
								});
							});
						}
					}
				});
			} else {
				if(dappResponse.log) {
					eventEmitter.emit(EVENTS.BICONOMY_ERROR,
						formatMessage(RESPONSE_CODES.ERROR_RESPONSE, dappResponse.log));
				} else {
					eventEmitter.emit(EVENTS.BICONOMY_ERROR,
						formatMessage(RESPONSE_CODES.DAPP_NOT_FOUND, `No Dapp Registered with dapp id ${dappId}`));
				}
			}
		}).catch(function(error) {
			eventEmitter.emit(EVENTS.BICONOMY_ERROR,
				formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Error while initializing Biconomy"), error);
		});
	} catch(error) {
		eventEmitter.emit(EVENTS.BICONOMY_ERROR,
			formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Error while initializing Biconomy"), error);
	}

}

/**
 * Method to get user contract wallet from biconomy server.
 **/
async function _getUserContractWallet(engine, address, cb) {
	let promise = new Promise((resolve, reject) => {
		if(address) {
			engine.sendAsync({
				jsonrpc: JSON_RPC_VERSION,
				id: '102',
				method: 'net_version',
				params: []
			}, function(error, response){
				if(error || (response && response.error)) {
					console.error(error || response.error);
					eventEmitter.emit(EVENTS.BICONOMY_ERROR,
						formatMessage(RESPONSE_CODES.NETWORK_ID_NOT_FOUND , "Could not get network version"), error || networkResponse.error);
					reject("Could not get network version");
				} else {
					let networkId = response.result;
					let data = {owner:address, networkId: networkId};
					axios
					  .get(`${baseURL}${getUserContractPath}`, {params: data})
					  .then(function(response) {
						const data = response.data;
						console.debug(data);
						if(data.flag && data.flag == BICONOMY_RESPONSE_CODES.SUCCESS) {
							if(cb) {
								cb(null, data.userContract);
							}
							resolve(data.userContract);
						} else {
							if(cb) {
								cb("User contract not found");
							}
							reject("User contract not found");
						}
					  })
					  .catch(function(error) {
						_logMessage(error);
						let response = formatMessage(RESPONSE_CODES.ERROR_RESPONSE,
							`Error while fetching user contract ${JSON.stringify(error)}`);
						if(cb) cb(response);
						reject(response);
					  });
				}
			});
		} else {
			let response = formatMessage(RESPONSE_CODES.INVALID_DATA, "Input address is not valid");
			if(cb) cb(response);
			reject(response);
		}
	});
	return promise;
}

/**
 * Function used to login user. This creates a smart contract wallet for new user and
 * just returns contract wallet address for existing user.
 *
 * This function should be used when you have access to user's private key.
 *
 * @param {string} signer User Externally Owned Account (EOA) address
 * @param {string} signature EIP712 formatted signature signed using signer address
 * @param {function} cb Optional callback method with error first parameter
 *
 * @returns A promise that resolves to response containg transaction hash for new user
 * and user contract wallet address for existing user.
 *
 * Refer to https://docs.biconomy.io for more details on how to use it.
 */
Biconomy.prototype.accountLogin = async function(signer, signature, cb) {
	let engine = this;
	return new Promise(async (resolve, reject) => {
		let data = {};
		data.signature = signature;
		data.from = signer;
		data.providerId = engine.providerId;
		axios
			.post(`${baseURL}${userLoginPath}`, data)
			.then(function(response) {
				const data = response?response.data:undefined;
				_logMessage(data);
				if(data) {
					let result = {}
					if(data.flag && data.flag == BICONOMY_RESPONSE_CODES.ACTION_COMPLETE) {
						result.code = RESPONSE_CODES.SUCCESS_RESPONSE;
						if(data.userContract) {
							result.message = `User login successfull`;
							result.userContract = data.userContract;
							engine.isLogin = true;
							_setLocalData(signer, data.userContract);
						} else if(data.transactionHash) {
							result.message = `User contract creation initiated`;
							result.transactionHash = data.transactionHash;
							loginInterval = setInterval(function(){
								getLoginTransactionReceipt(engine,data.transactionHash,signer)
							}, 2000);
						}
						if(cb) cb(null, result);
						resolve(result);
					} else {
						result.code = RESPONSE_CODES.ERROR_RESPONSE;
						result.message = data.log;
						if(cb) cb(result, null);
						reject(result);
					}
				} else {
					let error = formatMessage(RESPONSE_CODES.ERROR_RESPONSE, `Invalid response from api ${url}`);
					if(cb) cb(error);
					reject(error);
				}
			})
			.catch(function(error) {
				_logMessage(error);
				cb(error, null);
				reject(error);
			});
	});
}

const getLoginTransactionReceipt = async (engine,txHash,userAddress) => {
    var receipt = await web3.eth.getTransactionReceipt(txHash);
    if(receipt){
      	if(receipt.status){
        	await _getUserContractWallet(engine, userAddress, (error, userContract) => {
				if(!error && userContract) {
					_setLocalData(userAddress, userContract);
					engine.isLogin = true;
					eventEmitter.emit(EVENTS.LOGIN_CONFIRMATION, "User Contract wallet created Successfully", userContract);
				}
			});
      	}
      	else if(!receipt.status){
			eventEmitter.emit(EVENTS.BICONOMY_ERROR,formatMessage(RESPONSE_CODES.USER_CONTRACT_CREATION_FAILED,"User Contract wallet creation Failed"));
      	}
      	if(loginInterval){
        	clearInterval(loginInterval);
      	}
    }
}

Biconomy.prototype.isReady = function() {
	return (this.status === STATUS.BICONOMY_READY);
}

/**
 * Method used to login to biconomy. It takes user's public address as input
 * and if user contract wallet is not found for the user then it deploys
 * new user contract for the user. It user contract already exists it just
 * resolve to the contract wallet address.
 *
 * @returns Promise object that resolve to either transactionHash info or Contract wallet address
 **/
Biconomy.prototype.login = async function(signer, cb){
	return new Promise(async (resolve, reject)=> {
		if(!signer || typeof signer != 'string') {
			let response = formatMessage(RESPONSE_CODES.INVALID_DATA, "signer parameter is mandatory and should be of type 'string'");
			if(cb) cb(response);
			reject(response);
			return;
		}
		let engine = this;
		let message = {};
		message.userAddress = signer.toLowerCase();
		message.providerId = engine.providerId
		let nonce = await _getUserNonce(signer, this);
		if(!nonce) {
			nonce = 0;
		}
		message.nonce = nonce;

		const dataToSign = JSON.stringify({
			types: {
				EIP712Domain: loginDomainType,
				LoginMessage: loginMessageType
			},
			domain: loginDomainData,
			primaryType: "LoginMessage",
			message: message
		});

		console.debug(`Biconomy engine status ${engine.status}`);
		if(engine.status != STATUS.BICONOMY_READY) {
			return cb(formatMessage(RESPONSE_CODES.BICONOMY_NOT_INITIALIZED,'Biconomy SDK is not initialized properly'));
		}
		web3.currentProvider.sendAsync({
			jsonrpc: JSON_RPC_VERSION,
			id: '101',
			method: config.signTypedV3Method,
			params: [signer, dataToSign]
		}, function(error, signature){
			if(error) {
				let response = formatMessage(RESPONSE_CODES.ERROR_RESPONSE, error);
				if(cb) cb(response);
				reject(response);
			} else {
				let data = {};
				data.signature = signature.result;
				data.from = signer;
				data.providerId = engine.providerId;
				axios
				.post(`${baseURL}${userLoginPath}`, data)
				.then(function(response) {
					const data = response.data;
					console.debug(data);
					let result = {}
					if(data.flag && data.flag == BICONOMY_RESPONSE_CODES.ACTION_COMPLETE) {
						result.code = RESPONSE_CODES.SUCCESS_RESPONSE;
						if(data.userContract) {
							result.message = `User login successfull`;
							result.userContract = data.userContract;
							engine.isLogin = true;
							_setLocalData(signer, data.userContract);
						} else if(data.transactionHash) {
							result.message = `User contract creation initiated`;
							result.transactionHash = data.transactionHash;
							loginInterval = setInterval(function(){
								getLoginTransactionReceipt(engine,data.transactionHash,signer)
							}, 2000);
						}
						if(cb) cb(null, result);
						resolve(result);
					} else {
						result.code = RESPONSE_CODES.ERROR_RESPONSE;
						result.message = data.log;
						if(cb) cb(result, null);
						reject(result);
					}
				})
				.catch(function(error) {
					console.debug(error);
					let response = formatMessage(RESPONSE_CODES.ERROR_RESPONSE, error);
					if(cb) cb(response);
					reject(response);
				});
			}
		});
	});
};

/**
 * Function used to logout user from biconomy. It clears any internal user state and local storage.
 */
Biconomy.prototype.logout = function() {
	removeFromStorage(USER_ACCOUNT);
	removeFromStorage(USER_CONTRACT);
	this.isLogin = false;
}

/**
 * Function to return user contract wallet address.
 *
 * @param {string} userAddress User address for which contract wallet is requested
 * @returns A promise that resolves to user contact wallet if it exists else error response.
 */
Biconomy.prototype.getUserContract = async function(userAddress) {
	let response;
	if(this.isLogin) {
		let userAddressFromStorage = getFromStorage(USER_ACCOUNT);
		if(userAddressFromStorage && userAddress){
			if( userAddressFromStorage.toLowerCase() === userAddress.toLowerCase()) {
				response = formatMessage(RESPONSE_CODES.SUCCESS_RESPONSE, "User Contract Wallet address fetched successfully");
				response.userContract = getFromStorage(USER_CONTRACT);
			}
			if(!response) {
				let userContract = await _getUserContractWallet(this, userAddress);
				if(userContract) {
					response = formatMessage(RESPONSE_CODES.SUCCESS_RESPONSE, "User Contract Wallet address fetched successfully");
					response.userContract = userContract;
				} else {
					response = formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Unable to fetch User Contract Wallet");
				}
			}
		}
	} else {
		response = formatMessage(RESPONSE_CODES.USER_NOT_LOGGED_IN, "Please login to biconomy first");
	}
	return response;
}

Biconomy.prototype.getUserAccount = async function() {
	return await _getUserAccount(this);
}

function formatMessage(code, message) {
	return {
		code: code,
		message: message
	};
}

/**
 * Setting data in localstorage to check later if user contract and user account
 * already exists and user has already logged in to biconomy once.
 **/
function _setLocalData(signer, userContract) {
	if(typeof localStorage != 'undefined') {
		if(signer && userContract) {
			localStorage.setItem(USER_ACCOUNT, signer);
			localStorage.setItem(USER_CONTRACT, userContract);
		}
	} else {
		this[USER_ACCOUNT] = signer;
		this[USER_CONTRACT] = userContract;
	}
}


function removeFromStorage(key) {
	if(typeof localStorage != 'undefined') {
		localStorage.removeItem(key);
	} else {
		this[key] = null;
	}
}

function getFromStorage(key) {
	if(typeof localStorage != 'undefined') {
		return localStorage.getItem(key);
	} else {
		return this[key];
	}
}

/**
 * Single method to be used for logging purpose.
 *
 * @param {string} message Message to be logged
 */
function _logMessage(message) {
	if(config && config.logsEnabled && console.log) {
		console.log(message);
	}
}

var scientificToDecimal = function (num) {
    var nsign = Math.sign(num);
    //remove the sign
    num = Math.abs(num);
    //if the number is in scientific notation remove it
    if (/\d+\.?\d*e[\+\-]*\d+/i.test(num)) {
        var zero = '0',
                parts = String(num).toLowerCase().split('e'), //split into coeff and exponent
                e = parts.pop(), //store the exponential part
                l = Math.abs(e), //get the number of zeros
                sign = e / l,
                coeff_array = parts[0].split('.');
        if (sign === -1) {
            l = l - coeff_array[0].length;
            if (l < 0) {
              num = coeff_array[0].slice(0, l) + '.' + coeff_array[0].slice(l) + (coeff_array.length === 2 ? coeff_array[1] : '');
            }
            else {
              num = zero + '.' + new Array(l + 1).join(zero) + coeff_array.join('');
            }
        }
        else {
            var dec = coeff_array[1];
            if (dec)
                l = l - dec.length;
            if (l < 0) {
			  num
			  = coeff_array[0] + dec.slice(0, l) + '.' + dec.slice(l);
            } else {
              num = coeff_array.join('') + new Array(l + 1).join(zero);
            }
        }
    }
    return nsign < 0 ? '-'+num : num;
};

module.exports = Biconomy

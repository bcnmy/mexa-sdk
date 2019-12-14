import axios from "axios";
const Promise = require('promise');
const txDecoder = require('ethereum-tx-decoder');
const util = require('util');
const {config, RESPONSE_CODES, EVENTS, BICONOMY_RESPONSE_CODES, STATUS} = require('./config');

const Web3 = require('web3');
const baseURL = config.baseURL;
const userLoginPath = config.userLoginPath;
const getUserContractPath = config.getUserContractPath;
const JSON_RPC_VERSION = config.JSON_RPC_VERSION;
const USER_ACCOUNT = config.USER_ACCOUNT;
const USER_CONTRACT = config.USER_CONTRACT;

let decoderMap = {};
let web3;
const events = require('events');
var eventEmitter = new events.EventEmitter();

function Biconomy(provider, options) {
	console.debug(provider);
	console.debug(options);
	// Handle websocket provider on function
	if(provider.on) {
		this.providerOn = provider.on;
	}

	_validate(options);
	let _self = this;
	this.status = STATUS.INIT;
	this.dappId = options.dappId;
	this.apiKey = options.apiKey;
	this.isLogin = false;
	this.dappAPIMap = {};
	this.strictMode = options.strictMode || false;
	this.providerId = options.providerId || 100;
	this.readViaContract = options.readViaContract || false;
	this.messageToSign = options.messageToSign || config.MESSAGE_TO_SIGN;
	this.loginMessageToSign = options.loginMessageToSign || config.LOGIN_MESSAGE_TO_SIGN;
	this.READY = STATUS.BICONOMY_READY;
	this.LOGIN_CONFIRMATION = EVENTS.LOGIN_CONFIRMATION;
	this.ERROR = EVENTS.BICONOMY_ERROR;
	this.pendingLoginTransactions = {};
	_init(this.dappId, this.apiKey, this);

	if(provider) {
		web3 = new Web3(provider);
		// Copy all properties of provider except 'on' function
		for(var key in provider) {
			if(key != 'on') {
				this[key] = provider[key];
			}
		}

		this.providerSendAsync = provider.send || provider.sendAsync;
		this.sendAsync = function(payload, cb) {
			if(payload.method == 'eth_sendTransaction') {
				if(this.isLogin) {
					handleSendTransaction(this, payload, (error, result) => {
						let response = _createJsonRpcResponse(payload, error, result);
						cb(error, response);
					});
				} else {
					let error = {};
					error.message = 'User not logged in to biconomy';
					error.code = RESPONSE_CODES.USER_NOT_LOGGED_IN;
					cb(error);
				}
			} else if(payload.method == 'eth_sendRawTransaction') {
				sendSignedTransaction(this, payload, (error, result) => {
					let response = _createJsonRpcResponse(payload, error, result);
					cb(error, response);
				});
			} else if(payload.method == 'eth_call') {
				let userContract = localStorage.getItem(USER_CONTRACT);
				if(this.readViaContract && this.isLogin && userContract) {
					if(payload && payload.params && payload.params[0]) {
						payload.params[0].from = userContract;
					}
				}
				this.providerSendAsync(payload, cb);
			} else {
				this.providerSendAsync(payload, cb);
			}
		};
		this.send = this.sendAsync;

		const subscription = web3.eth.subscribe('logs',{
			topics:['0x5983cdcaa370320b76fe01a3a32a0430e6a13b9f47a55e806afb13b5aef95a12']
		}, function(error, result){
			if(error) {
				console.error(error);
			}
		}).on("data", function(log) {
			console.debug(log);
			if(log && _self.pendingLoginTransactions[log.transactionHash]) {
				if(log.topics && log.topics.length >= 3) {
					let userAddress = web3.eth.abi.decodeParameter('address', log.topics[2]);
					console.debug(`Got transaction log from blockchain having user address ${userAddress}`);
					_getUserContractWallet(_self, userAddress, (error, userContract) => {
						if(!error && userContract) {
							_setLocalData(userAddress, userContract);
							_self.isLogin = true;
							eventEmitter.emit(EVENTS.LOGIN_CONFIRMATION, log);
							delete _self.pendingLoginTransactions[log.transactionHash];
						}
					});
				}
			}
		});
	} else {
		throw new Error('Please pass a provider to Biconomy.');
	}
}

Biconomy.prototype.getLoginMessageToSign = async function(signer) {
	let nonce = await _getUserNonce(signer, this);
	if(!nonce) {
		nonce = 0;
	}
	let message = `${this.loginMessageToSign}${nonce}`;
	return message;
}

Biconomy.prototype.on = function(type, callback) {
	if(type == this.READY || type == this.ERROR || type == this.LOGIN_CONFIRMATION) {
		return eventEmitter.on(type, callback);
	} else {
		return this.providerOn(type, callback);
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

async function sendSignedTransaction(engine, payload, end) {
	if(payload && payload.params && payload.params[0]) {
		let rawTx = payload.params[0];
		let signer = web3.eth.accounts.recoverTransaction(rawTx);
		let decodedTx = txDecoder.decodeTx(rawTx);
		if(decodedTx.to && decodedTx.data) {
			const methodInfo = decodeMethod(decodedTx.to.toLowerCase(), decodedTx.data);
			if(!methodInfo) {
				return end(`Smart Contract address registered on dashboard is different than what is sent(${decodedTx.to}) in current transaction`);
			}
			let methodName = methodInfo.name;
			let api = engine.dappAPIMap[methodName];
			if(!api) {
				console.debug(`API not found for method ${methodName}`);
				console.debug(`Strict mode ${engine.strictMode}`);
				if(engine.strictMode) {
					let error = {};
					error.code = RESPONSE_CODES.API_NOT_FOUND;
					error.message = `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`;
					return end(error, null);
				} else {
					console.debug(`Falling back to default provider as strict mode is false in biconomy`);
					return engine.providerSendAsync(payload, end);
				}
			}
			console.debug('API found');
			let params = methodInfo.params;
			let paramArray = [];
			for(let i = 0; i < params.length; i++) {
				paramArray.push(_getParamValue(params[i]));
			}

			let account = signer;
			if(!account) {
				return end(`Not able to get user account`);
			}

			let nonce = await _getUserNonce(account, engine);
			if(!nonce) {
				let error = formatMessage(RESPONSE_CODES.USER_ACCOUNT_NOT_FOUND ,`User is not a registered biconomy user`);
				eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
				end(error);
			}

			let data = {};
			data.rawTx = rawTx;
			data.signer = account;
			data.apiId = api.id;
			data.dappId = engine.dappId;
			data.params = paramArray;
			data.data = decodedTx.data;
			_sendTransaction(engine, account, api, data, end);

		} else {
			let error = formatMessage(RESPONSE_CODES.BICONOMY_NOT_INITIALIZED ,
				`Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard`);
			eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
			end(error);
		}
	} else {
		let error = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD ,
			`Invalid payload data ${payload}. Expecting params key to be an array with first element having a 'to' property`);
		eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
		end(error);
	}
}

/**
 * Function decodes the parameter in payload and gets the user signature using personal_sign
 * method and send the request to biconomy for processing and call the callback method 'end'
 * with transaction hash.
 **/
async function handleSendTransaction(engine, payload, end) {
	console.debug('Handle transaction with payload');
	console.debug(payload);
	if(payload.params && payload.params[0] && payload.params[0].to) {
		if(decoderMap[payload.params[0].to]) {
			const methodInfo = decodeMethod(payload.params[0].to.toLowerCase(), payload.params[0].data);
			let methodName = methodInfo.name;
			let api = engine.dappAPIMap[methodName];
			if(!api) {
				console.debug(`API not found for method ${methodName}`);
				console.debug(`Strict mode ${engine.strictMode}`);
				if(engine.strictMode) {
					let error = {};
					error.code = RESPONSE_CODES.API_NOT_FOUND;
					error.message = `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`;
					end(error, null);
				} else {
					console.debug(`Falling back to default provider as strict mode is false in biconomy`);
					return engine.providerSendAsync(payload, end);
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
			let message = engine.messageToSign;
			let nonce = await _getUserContractNonce(account, engine);
			if(!nonce) {
				let error = formatMessage(RESPONSE_CODES.USER_ACCOUNT_NOT_FOUND ,`User is not a registered biconomy user`);
				eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
				end(error);
			}
			message += nonce;
			let messageLength = message.length;

			engine.sendAsync({
				jsonrpc: JSON_RPC_VERSION,
				id: payload.id,
				method: 'personal_sign',
				params: [web3.utils.utf8ToHex(message), account]
			}, function(error, response) {
				console.info(`User signature for payload id ${payload.id} is ${response.result}`);
				if(error) {
					end(error);
				} else if(response && response.error) {
					end(response.error);
				} else if(response && response.result) {
					let data = {};
					data.signature = response.result;
					data.signer = account;
					data.message = engine.messageToSign;
					data.messageLength = messageLength;
					data.apiId = api.id;
					data.dappId = engine.dappId;
					data.params = paramArray;
					_sendTransaction(engine, account, api, data, end);
				} else {
					end();
				}
			});
		} else {
			let error = formatMessage(RESPONSE_CODES.BICONOMY_NOT_INITIALIZED ,
				`Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard`);
			eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
			end(error);
		}
	} else {
		let error = formatMessage(RESPONSE_CODES.INVALID_PAYLOAD ,
			`Invalid payload data ${payload}. Expecting params key to be an array with first element having a 'to' property`);
		eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
		end(error);
	}
}

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

async function _getUserContractNonce(address, engine) {
	try {
		let getNonceAPI = `${baseURL}/api/${config.version}/dapp-user/getContractNonce?signer=${address}`;
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
	console.debug(engine);
});

/**
 * Get user account from current provider using eth_accounts method.
 **/
function _getUserAccount(engine, payload, cb) {
	if(engine) {
		let id = 99999999;
		if(payload) {
			id = payload.id;
		}
		if(cb) {
			engine.sendAsync({jsonrpc: JSON_RPC_VERSION, id: id, method: 'eth_accounts', params: []}, cb);
		} else {
			return new Promise(function(resolve, reject) {
				engine.sendAsync({jsonrpc: JSON_RPC_VERSION, id: id, method: 'eth_accounts', params: []}, function(error, res){
					if(error) {
						reject(error);
					} else if(!res.result) {
						reject(`Invalid response ${res}`);
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
				value = parseInt(paramObj.value);
				break;
			case 'string':
				value = JSON.stringify(paramObj.value);
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
		if(data.rawTx) {
			url = config.handleSignedTxUrl;
		}
		axios
	      .post(`${baseURL}${url}`, data)
	      .then(function(response) {
	      	console.debug(response);
	        const result = response.data;
	        if(result.flag && result.flag != BICONOMY_RESPONSE_CODES.ACTION_COMPLETE
	        	&& result.flag != BICONOMY_RESPONSE_CODES.SUCCESS) {
	        	let error = {};
	        	error.code = result.flag;
	        	if(result.flag == BICONOMY_RESPONSE_CODES.USER_CONTRACT_NOT_FOUND) {
	        		error.code = RESPONSE_CODES.USER_CONTRACT_NOT_FOUND;
	        	}
	        	error.message = result.log;
	        	cb(error);
	        } else {
	        	cb(null, result.txHash);
	        }
	      })
	      .catch(function(error) {
	        console.debug(error);
	        cb(error);
	      });
	} else {
		console.debug(`Invalid arguments, provider: ${engine} account: ${account} api: ${api} data: ${data}`);
		cb(`Invalid arguments, provider: ${engine} account: ${account} api: ${api} data: ${data}`, null);
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
function _init(dappId, apiKey, engine) {
	try {
		// Check current network id and dapp network id registered on dashboard
		let getDappAPI = `${baseURL}/api/${config.version}/dapp?dappId=${dappId}`;
		axios.defaults.headers.common["x-api-key"] = apiKey;
		axios.get(getDappAPI).then(function(response) {
			let dappResponse = response.data;
			if(dappResponse && dappResponse.dapp) {
				let dappNetworkId = dappResponse.dapp.networkId;
				console.debug(`Network id corresponding to dapp id ${dappId} is ${dappNetworkId}`);

				engine.sendAsync({
					jsonrpc: JSON_RPC_VERSION,
					id: '102',
					method: 'net_version',
					params: []
				}, function(error, networkResponse){
					if(error || (networkResponse && networkResponse.error)) {
						eventEmitter.emit(EVENTS.BICONOMY_ERROR,
							formatMessage(RESPONSE_CODES.NETWORK_ID_NOT_FOUND , "Could not get network version"), error || networkResponse.error);
					} else {
						let providerNetworkId = networkResponse.result;
						console.debug(`Current provider network id: ${providerNetworkId}`);
						if(providerNetworkId != dappNetworkId) {
							eventEmitter.emit(EVENTS.BICONOMY_ERROR,
								formatMessage(RESPONSE_CODES.NETWORK_ID_MISMATCH,
								`Current networkId ${providerNetworkId} is different from dapp network id registered on mexa dashboard ${dappNetworkId}`));
						} else {
							// Get dapps smart contract data from biconomy servers
							let getDAppInfoAPI = `${baseURL}/api/${config.version}/smart-contract?dappId=${dappId}`;
							axios.get(getDAppInfoAPI).then(function(response) {
								let result = response.data;
								if(!result && result.flag != 143) {
									eventEmitter.emit(EVENTS.BICONOMY_ERROR,
										formatMessage(RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND ,
											`Error getting smart contract for dappId ${dappId}`));
								}
								let smartContractList = result.smartContracts;
								if(smartContractList && smartContractList.length > 0) {
									smartContractList.forEach(contract => {
										let abiDecoder = require('abi-decoder');
										abiDecoder.addABI(JSON.parse(contract.abi));
										decoderMap[contract.address.toLowerCase()] = abiDecoder;
									});

									let userLocalAccount = localStorage.getItem(USER_ACCOUNT);
									let userLocalContract = localStorage.getItem(USER_CONTRACT);
									if(userLocalContract && userLocalAccount) {
										_getUserAccount(engine, undefined, (error, response) => {
											if(error || response.error) {
												eventEmitter.emit(EVENTS.BICONOMY_ERROR,
													formatMessage(RESPONSE_CODES.USER_ACCOUNT_NOT_FOUND ,
														"Could not get user account"));
											}
											let account = response.result[0];
											_getUserContractWallet(engine, account, (error, userContract) => {
												if(userContract && account && account.toUpperCase() == userLocalAccount.toUpperCase()
													&& userContract.toUpperCase() == userLocalContract.toUpperCase()) {
													engine.isLogin = true;
													console.debug('Biconomy user login set to true');
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
function _getUserContractWallet(engine, address, cb) {
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
			} else {
				let networkId = response.result;
				let data = {owner:address, networkId: networkId};
				axios
			      .get(`${baseURL}${getUserContractPath}`, {params: data})
			      .then(function(response) {
			        const data = response.data;
			        console.debug(data);
			        if(data.flag && data.flag == BICONOMY_RESPONSE_CODES.SUCCESS) {
			        	cb(null, data.userContract);
			        } else {
			        	cb("User contract not found");
			        }
			      })
			      .catch(function(error) {
			        console.error(error);
			        cb(`Error while fetching user contract ${error}`);
			      });
			}
		});
	} else {
		cb("Input address is not valid");
	}
}

Biconomy.prototype.accountLogin = async function(signer, signature, cb) {
	let engine = this;
	let data = {};
	data.signature = signature;
	data.signer = signer;
	data.message = engine.loginMessageToSign;
	data.provider = engine.providerId;
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
					addPendingLoginTransactions(engine, data.transactionHash);
					console.debug(`Transaction hash ${data.transactionHash} added to pending transactions`);
				}
				cb(null, result);
			} else {
				result.code = RESPONSE_CODES.ERROR_RESPONSE;
				result.message = data.log;
				cb(result, null);
			}
		})
		.catch(function(error) {
			console.debug(error);
			cb(error, null);
		});
}

/**
 * Method used to login to biconomy. It takes user's signature as input
 * and if user contract wallet is not found for the user then it deploys
 * new user contract for the user. It user contract already exists it just
 * returns the contract wallet address.
 **/
Biconomy.prototype.login = async function(signer, cb){
	let message = this.loginMessageToSign;
	let nonce = await _getUserNonce(signer, this);
	if(!nonce) {
		nonce = 0;
	}
	message += nonce;

	let engine = this;
	console.debug(`Biconomy engine status ${engine.status}`);
	if(engine.status != STATUS.BICONOMY_READY) {
		return cb(formatMessage(RESPONSE_CODES.BICONOMY_NOT_INITIALIZED,'Biconomy SDK is not initialized properly'));
	}
	engine.sendAsync({
		jsonrpc: JSON_RPC_VERSION,
		id: '101',
		method: 'personal_sign',
		params: [web3.utils.utf8ToHex(message), signer]
	}, function(error, signature){
		if(error) {
			cb(error, null);
		} else {
			let data = {};
			data.signature = signature.result;
			data.signer = signer;
			data.message = engine.loginMessageToSign;
			data.provider = engine.providerId;
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
		        		addPendingLoginTransactions(engine, data.transactionHash);
		        		console.debug(`Transaction hash ${data.transactionHash} added to pending transactions`);
		        	}
		        	cb(null, result);
		        } else {
		        	result.code = RESPONSE_CODES.ERROR_RESPONSE;
		        	result.message = data.log;
		        	cb(result, null);
		        }
		      })
		      .catch(function(error) {
		        console.debug(error);
		        cb(error, null);
		      });
		}
	});
};

function addPendingLoginTransactions(engine, txHash) {
	engine.pendingLoginTransactions[txHash] = true;
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
	if(signer && userContract) {
		localStorage.setItem(USER_ACCOUNT, signer);
		localStorage.setItem(USER_CONTRACT, userContract);
	}
}
export default Biconomy
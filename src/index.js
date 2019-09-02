import axios from "axios";
const Promise = require('promise');
const web3 = require('web3');
const baseURL = "http://localhost:4000";
const STATUS = {INIT: 'init', READY:'ready', NO_DATA:'no_data'};
const EVENTS = {
	SMART_CONTRACT_DATA_READY: 'smart_contract_data_ready',
	DAPP_API_DATA_READY: 'dapp_api_data_ready'
};

const RESPONSE_CODE = {
	FAILURE_RESPONSE: 'b500',
	API_NOT_FOUND : 'b501',
	USER_CONTRACT_NOT_FOUND: 'b502',
	SUCCESS_RESPONSE: 'b200'
};

const BICONOMY_RESPONSE_CODES = {
	SUCCESS : 200,
	ACTION_COMPLETE: 143,
	USER_CONTRACT_NOT_FOUND: 148
};

const JSON_RPC_VERSION = '2.0';
const MESSAGE_TO_SIGN = 'Sign message to prove the ownership of your account';
let decoderMap = {};
const events = require('events');
var eventEmitter = new events.EventEmitter();

function Biconomy(provider, options) {
	_validate(options);
	let _self = this;
	this.status = STATUS.INIT;
	this.dappId = options.dappId;
	this.apiKey = options.apiKey;
	this.isLogin = false;
	this.dappAPIMap = {};
	this.strictMode = options.strictMode || false;
	this.providerId = options.providerId || 100;

	_init(this.dappId, this.apiKey, this);

	if(provider) {
		// Copy all properties of provider
		for(var key in provider) {
			this[key] = provider[key];	
		}

		this.providerSendAsync = provider.sendAsync;
		this.sendAsync = function(payload, cb) {
			if(payload.method == 'eth_sendTransaction') {
				handleSendTransaction(this, payload, (error, result) => {
					let response = _createJsonRpcResponse(payload, error, result);
					cb(error, response);
				});
			} else {
				this.providerSendAsync(payload, cb);
			}
		};
	} else {
		throw new Error('Please pass a provider to Biconomy.');
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

/**
 * Function decodes the parameter in payload and gets the user signature using personal_sign
 * method and send the request to biconomy for processing and call the callback method 'end' 
 * with transaction hash.
 **/
async function handleSendTransaction(engine, payload, end) {
	if(payload.params && payload.params[0] && payload.params[0].to 
		&& decoderMap[payload.params[0].to]) {
		const methodInfo = decoderMap[payload.params[0].to.toLowerCase()].decodeMethod(payload.params[0].data);
		let methodName = methodInfo.name;
		let api = engine.dappAPIMap[methodName];
		if(!api) {
			console.log('API not found');
			console.warn(`Strict mode ${engine.strictMode}`);
			if(engine.strictMode) {
				let error = {};
				error.code = RESPONSE_CODE.API_NOT_FOUND;
				error.message = `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`;
				end(error, null);
			} else {
				return engine.providerSendAsync(payload, end);
			}
		}
		let params = methodInfo.params;
		let paramArray = [];
		for(let i = 0; i < params.length; i++) {
			paramArray.push(_getParamValue(params[i]));
		}
		
		let account = await _getUserAccount(engine, payload);
		if(!account) {
			return end(`Not able to get user account`);
		}
		let message = MESSAGE_TO_SIGN;
		engine.sendAsync({
			jsonrpc: JSON_RPC_VERSION, 
			id: payload.id, 
			method: 'personal_sign', 
			params: [web3.utils.utf8ToHex(message), account]
		}, function(error, response) {
			if(error) {
				end(error);
			} else if(response && response.error) {
				end(response.error);
			} else if(response && response.result) {
				let data = {};
				data.signature = response.result;
				data.signer = account;
				data.message = message;
				data.apiId = api.id;
				data.dappId = engine.dappId;
				data.params = paramArray;
				_sendTransaction(engine, account, api, data, end);
			} else {
				end();
			}
		});
	}
}

// On getting smart contract data get the API data also
eventEmitter.on(EVENTS.SMART_CONTRACT_DATA_READY, (dappId, engine)=>{
	// Get DApp API information from Database
    let getAPIInfoAPI = `${baseURL}/api/v1/meta-api?dappId=${dappId}`;
	axios.get(getAPIInfoAPI).then(function(response) {
		if(response && response.data && response.data.listApis) {
			let apiList = response.data.listApis;
			for(let i=0;i<apiList.length;i++) {
				engine.dappAPIMap[apiList[i].method] = apiList[i];
			}
			eventEmitter.emit(EVENTS.DAPP_API_DATA_READY, engine);
		}
	}).catch(function(error) {
      console.log(error);
    });
});

eventEmitter.on(EVENTS.DAPP_API_DATA_READY, (engine)=>{
	engine.status = STATUS.READY;
});

/**
 * Get user account from current provider using eth_accounts method.
 **/
function _getUserAccount(engine, payload, cb) {
	if(engine) {	
		if(cb) {
			engine.sendAsync({jsonrpc: JSON_RPC_VERSION, id: payload.id, method: 'eth_accounts', params: []}, cb);	
		} else {
			return new Promise(function(resolve, reject) {
				engine.sendAsync({jsonrpc: JSON_RPC_VERSION, id: payload.id, method: 'eth_accounts', params: []}, function(error, res){
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
		axios
	      .post(`${baseURL}${api.url}`, data)
	      .then(function(response) {
	      	console.log(response);
	        const result = response.data;
	        if(result.flag && result.flag != BICONOMY_RESPONSE_CODES.ACTION_COMPLETE 
	        	&& result.flag != BICONOMY_RESPONSE_CODES.SUCCESS) {
	        	let error = {};
	        	error.code = result.flag;
	        	if(result.flag == BICONOMY_RESPONSE_CODES.USER_CONTRACT_NOT_FOUND) {
	        		error.code = RESPONSE_CODE.USER_CONTRACT_NOT_FOUND;
	        	}
	        	error.message = result.log;
	        	cb(error);
	        } else {
	        	console.log(result);
	        	cb(null, result.txHash);     	
	        }	        
	      })
	      .catch(function(error) {
	        console.log(error);
	        cb(error);
	      });
	} else {
		cb(`Invalid arguments, provider: ${engine} account: ${account} api: ${api} data: ${data}`, null);
	}
}

function getData(engine, account, methodName, params,  cb) {
	if(engine && account && methodName && cb) {
		let api = engine.dappAPIMap[methodName];
		if(!api) {
			let error = {};
			error.code = RESPONSE_CODE.API_NOT_FOUND;
			error.message = `No registered API found for method ${methodName}. Please register API from developer dashboard.`;
			cb(error, null);
		} else {
			let data = getReadAPIData(api.id, engine.dappId, params, account);
			axios
		      .post(`${baseURL}${api.url}`, data)
		      .then(function(response) {
		        const data = response.data;
		        console.log(data.result);
		        let stringResult = JSON.stringify(data.result);
		        const hexResult = "0x"+[stringResult].map((c,i)=>stringResult.charCodeAt(i).toString(16)).join("");
		        cb(null, hexResult);     
		      })
		      .catch(function(error) {
		        console.log(error);
		        cb(error, null);
		      });
		}
	}
}

function getReadAPIData(apiId, dappId, params, account) {
  	let data = {};
    data.apiId = apiId;
    data.dappId = dappId;
    data.signer = account;	   
	data.params = params;    
    return data;
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
	// Get dapps smart contract data from biconomy servers
	let getDAppInfoAPI = `${baseURL}/api/v1/smart-contract?dappId=${dappId}`;
	axios.defaults.headers.common["x-api-key"] = apiKey;
	axios.get(getDAppInfoAPI).then(function(response) {
		let result = response.data;
		if(!result && result.flag != 143) {
			throw new Error(`Error getting smart contract for dappId ${dappId}`);
		}
		let smartContractList = result.smartContracts;
		if(smartContractList && smartContractList.length > 0) {
			smartContractList.forEach(contract => {
				let abiDecoder = require('abi-decoder');
				abiDecoder.addABI(JSON.parse(contract.abi));
				decoderMap[contract.address.toLowerCase()] = abiDecoder;
			});
			eventEmitter.emit(EVENTS.SMART_CONTRACT_DATA_READY, dappId, engine);
		} else {
			engine.status = STATUS.NO_DATA;
			console.error(`No smart contract found for dappId ${dappId}`);
		}
    })
    .catch(function(error) {
      console.log(error);
    });    
}

/**
 * Method used to login to biconomy. It takes user's signature as input
 * and if user contract wallet is not found for the user then it deploys
 * new user contract for the user. It user contract already exists it just
 * returns the contract wallet address.
 **/
Biconomy.prototype.login = function(signer, cb){
	let message = "Sign message to login to Biconomy";
	let engine = this;
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
			data.message = message;
			data.provider = engine.providerId;
			axios
		      .post(`${baseURL}/api/v1/dapp-user/login`, data)
		      .then(function(response) {
		        const data = response.data;
		        let result = {}
		        if(data.flag && data.flag == BICONOMY_RESPONSE_CODES.ACTION_COMPLETE) {
		        	result.code = RESPONSE_CODE.SUCCESS_RESPONSE;
		        	result.message = `User login successfull`;
		        	result.data = data;
		        	engine.isLogin = true;
		        	cb(null, result);
		        } else {
		        	result.code = RESPONSE_CODE.FAILURE_RESPONSE;
		        	result.message = data.log;
		        	cb(result, null);
		        }
		      })
		      .catch(function(error) {
		        console.log(error);
		        cb(error, null);
		      });
		}
	});
};

export default Biconomy
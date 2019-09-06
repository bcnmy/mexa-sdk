let config = {}
config.baseURL = "https://api.biconomy.io";
config.userLoginPath = "/api/v1/dapp-user/login";
config.MESSAGE_TO_SIGN = 'Sign message to prove the ownership of your account';
config.USER_ACCOUNT = "BUA";
config.USER_CONTRACT = "BUC";
config.JSON_RPC_VERSION = '2.0';
config.LOGIN_MESSAGE_TO_SIGN = "Sign message to login to Biconomy";

const EVENTS = {
	SMART_CONTRACT_DATA_READY: 'smart_contract_data_ready',
	DAPP_API_DATA_READY: 'dapp_api_data_ready'
};

const RESPONSE_CODES = {
	FAILURE_RESPONSE: 'B500',
	API_NOT_FOUND : 'B501',
	USER_CONTRACT_NOT_FOUND: 'B502',
	USER_NOT_LOGGED_IN: 'B503',
	USER_ACCOUNT_NOT_FOUND: 'B504',
	SUCCESS_RESPONSE: 'B200'
};

const BICONOMY_RESPONSE_CODES = {
	SUCCESS : 200,
	ACTION_COMPLETE: 143,
	USER_CONTRACT_NOT_FOUND: 148
};

const STATUS = {
	INIT: 'init', 
	BICONOMY_READY:'biconomy_ready', 
	NO_DATA:'no_data'
};

module.exports = {
	config,
	EVENTS,
	RESPONSE_CODES,
	BICONOMY_RESPONSE_CODES,
	STATUS
}
let config = {}
config.version = 'v1';
config.version2 = 'v2';
config.signTypedV3Method = "eth_signTypedData_v3";
config.loginDomainName = "Biconomy Login";
config.loginVersion = "1";
config.eip712SigVersion = "1";
config.eip712DomainName = "Biconomy Meta Transaction";
config.eip712VerifyingContract = "0x3457dC2A8Ff1d3FcC45eAd532CA1740f5c477160";
config.baseURL = "https://api.biconomy.io";
config.nativeMetaTxUrl = `/api/${config.version2}/meta-tx/native`;
config.userLoginPath = `/api/${config.version2}/dapp-user/login`;
config.withdrawFundsUrl = `/api/${config.version2}/meta-tx/withdraw`;
config.getUserContractPath = `/api/${config.version2}/dapp-user/getUserContract`;
config.MESSAGE_TO_SIGN = 'Sign message to prove the ownership of your account with counter ';
config.WITHDRAW_MESSAGE_TO_SIGN = 'Provide your signature to withdraw funds with counter ';
config.USER_ACCOUNT = "BUA";
config.USER_CONTRACT = "BUC";
config.JSON_RPC_VERSION = '2.0';
config.LOGIN_MESSAGE_TO_SIGN = "Sign message to login to Biconomy with counter ";
config.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
config.PAYMENT_TOKEN_CONTRACT = config.ZERO_ADDRESS;
config.PAYMENT_TOKEN_AMOUNT = 0;
config.NONCE_BATCH_ID = 0;
config.EXPIRY = 0;
config.BASE_GAS = 0;
config.RELAYER_ADDRESS = config.ZERO_ADDRESS;
config.TOKEN_CONTRACT_ADDRESS = config.ZERO_ADDRESS;
config.DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS = config.ZERO_ADDRESS;
config.DEFAULT_RELAYER_PAYMENT_AMOUNT = 0;
config.DEFAULT_DESCRIPTION = "Smart Contract Interaction";

config.handleSignedTxUrl = `/api/${config.version2}/meta-tx/sendSignedTx`;
config.logsEnabled = false;

const EVENTS = {
	SMART_CONTRACT_DATA_READY: 'smart_contract_data_ready',
	DAPP_API_DATA_READY: 'dapp_api_data_ready',
	LOGIN_CONFIRMATION: 'login_confirmation',
	BICONOMY_ERROR: 'biconomy_error'
};

const RESPONSE_CODES = {
	ERROR_RESPONSE: 'B500',
	API_NOT_FOUND : 'B501',
	USER_CONTRACT_NOT_FOUND: 'B502',
	USER_NOT_LOGGED_IN: 'B503',
	USER_ACCOUNT_NOT_FOUND: 'B504',
	NETWORK_ID_MISMATCH: 'B505',
	BICONOMY_NOT_INITIALIZED: 'B506',
	NETWORK_ID_NOT_FOUND: 'B507',
	SMART_CONTRACT_NOT_FOUND: 'B508',
	DAPP_NOT_FOUND: 'B509',
	INVALID_PAYLOAD: 'B510',
	DASHBOARD_DATA_MISMATCH: 'B511',
	SUCCESS_RESPONSE: 'B200',
	USER_CONTRACT_CREATION_FAILED:'B512',
	EVENT_NOT_SUPPORTED: 'B513',
	INVALID_DATA: 'B514'
};

const BICONOMY_RESPONSE_CODES = {
	SUCCESS : 200,
	ACTION_COMPLETE: 143,
	USER_CONTRACT_NOT_FOUND: 148,
	ERROR_RESPONSE: 144
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
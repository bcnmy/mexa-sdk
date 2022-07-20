"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Biconomy = void 0;
/* eslint-disable consistent-return */
/**
 * @dev Biconomy class that is the entry point
 */
const events_1 = __importDefault(require("events"));
const ethers_1 = require("ethers");
const axios_1 = __importDefault(require("axios"));
const gasless_messaging_sdk_1 = require("@biconomy/gasless-messaging-sdk");
const isomorphic_ws_1 = __importDefault(require("isomorphic-ws"));
const serialize_error_1 = require("serialize-error");
const utils_1 = require("./utils");
const config_1 = require("./config");
const handle_send_transaction_helper_1 = require("./helpers/handle-send-transaction-helper");
const send_signed_transaction_helper_1 = require("./helpers/send-signed-transaction-helper");
const get_system_info_helper_1 = require("./helpers/get-system-info-helper");
const signature_helpers_1 = require("./helpers/signature-helpers");
const send_transaction_helper_1 = require("./helpers/send-transaction-helper");
const meta_transaction_custom_helpers_1 = require("./helpers/meta-transaction-custom-helpers");
class Biconomy extends events_1.default {
    /**
     * constructor would initiliase providers and set values passed in options
     * strictMode true would return error, strictMode false would fallback to default provider
     * externalProvider is the provider dev passes (ex. window.ethereum)
     * this.provider is the proxy provider object that would intercept all rpc calls for the SDK
     */
    constructor(provider, options) {
        super();
        this.dappApiMap = {};
        this.interfaceMap = {};
        this.smartContractMap = {};
        this.smartContractMetaTransactionMap = {};
        this.smartContractTrustedForwarderMap = {};
        this.strictMode = false;
        this.getSystemInfo = get_system_info_helper_1.getSystemInfo;
        this.handleSendTransaction = handle_send_transaction_helper_1.handleSendTransaction;
        this.sendTransaction = send_transaction_helper_1.sendTransaction;
        this.sendSignedTransaction = send_signed_transaction_helper_1.sendSignedTransaction;
        this.getSignatureEIP712 = signature_helpers_1.getSignatureEIP712;
        this.getSignaturePersonal = signature_helpers_1.getSignaturePersonal;
        this.buildSignatureCustomEIP712MetaTransaction = meta_transaction_custom_helpers_1.buildSignatureCustomEIP712MetaTransaction;
        this.buildSignatureCustomPersonalSignMetaTransaction = meta_transaction_custom_helpers_1.buildSignatureCustomPersonalSignMetaTransaction;
        this.proxyProvider = {
            // Difference between send and request
            get: (target, prop, ...args) => {
                switch (prop) {
                    case 'send':
                        return this.handleRpcSend.bind(this);
                    case 'sendAsync':
                        return this.handleRpcSendAsync.bind(this);
                    case 'request':
                        return this.handleRpcRequest.bind(this);
                    default:
                        break;
                }
                return Reflect.get(target, prop, ...args);
            },
        };
        (0, utils_1.validateOptions)(options);
        this.apiKey = options.apiKey;
        this.strictMode = options.strictMode || false;
        this.externalProvider = provider;
        this.provider = this.proxyFactory();
        this.contractAddresses = options.contractAddresses;
        this.ethersProvider = new ethers_1.ethers.providers.Web3Provider(provider);
        this.clientMessenger = new gasless_messaging_sdk_1.ClientMessenger(config_1.config.webSocketConnectionUrl, isomorphic_ws_1.default);
        if (options.jsonRpcUrl) {
            this.readOnlyProvider = new ethers_1.ethers.providers.JsonRpcProvider(options.jsonRpcUrl);
        }
    }
    proxyFactory() {
        return new Proxy(this.externalProvider, this.proxyProvider);
    }
    handleRpcSendType1(payload, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const fallback = () => { var _a, _b; return (_b = (_a = this.externalProvider).send) === null || _b === void 0 ? void 0 : _b.call(_a, payload, callback); };
            const { method, params } = payload;
            try {
                switch (method) {
                    case 'eth_sendTransaction':
                        return yield this.handleSendTransaction({ params, fallback });
                    case 'eth_sendRawTransaction':
                        return yield this.sendSignedTransaction({ params, fallback });
                    default:
                        return fallback();
                }
            }
            catch (e) {
                return fallback();
            }
        });
    }
    handleRpcSendType2(method, params) {
        return __awaiter(this, void 0, void 0, function* () {
            // @ts-ignore
            const fallback = () => { var _a, _b; return (_b = (_a = this.externalProvider).send) === null || _b === void 0 ? void 0 : _b.call(_a, method, params); };
            try {
                switch (method) {
                    case 'eth_sendTransaction':
                        return yield this.handleSendTransaction({ params, fallback });
                    case 'eth_sendRawTransaction':
                        return yield this.sendSignedTransaction({ params, fallback });
                    default:
                        return fallback();
                }
            }
            catch (e) {
                return fallback();
            }
        });
    }
    handleRpcSendType3(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            // @ts-ignore
            const fallback = () => { var _a, _b; return (_b = (_a = this.externalProvider).send) === null || _b === void 0 ? void 0 : _b.call(_a, payload); };
            const { method, params } = payload;
            try {
                switch (method) {
                    case 'eth_sendTransaction':
                        return yield this.handleSendTransaction({ params, fallback });
                    case 'eth_sendRawTransaction':
                        return yield this.sendSignedTransaction({ params, fallback });
                    default:
                        return fallback();
                }
            }
            catch (e) {
                return fallback();
            }
        });
    }
    handleRpcSend(...args) {
        // provider.send is deprecated, but it is still commonly used, so we need to handle it
        // it has three signatures, and we need to support all of them.
        // ethereum.send(
        //   methodOrPayload: string | JsonRpcRequest,
        //   paramsOrCallback: Array<unknown> | JsonRpcCallback,
        // ): Promise<JsonRpcResponse> | void;
        // Type 1:
        // ethereum.send(payload: JsonRpcRequest, callback: JsonRpcCallback): void;
        // Type 2:
        // ethereum.send(method: string, params?: Array<unknown>): Promise<JsonRpcResponse>;
        // Type 3:
        // ethereum.send(payload: JsonRpcRequest): unknown;
        if (typeof args[0] === 'string') {
            // this is type 2
            return this.handleRpcSendType2(args[0], args[1]);
        }
        if (!args[1]) {
            // this is type 3
            return this.handleRpcSendType3(args[0]);
        }
        // this is type 1
        return this.handleRpcSendType1(args[0], args[1]);
    }
    handleRpcSendAsync(payload, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const fallback = () => { var _a, _b; return (_b = (_a = this.externalProvider).sendAsync) === null || _b === void 0 ? void 0 : _b.call(_a, payload, callback); };
            const { method, params } = payload;
            try {
                switch (method) {
                    case 'eth_sendTransaction':
                        return yield this.handleSendTransaction({ params, fallback });
                    case 'eth_sendRawTransaction':
                        return yield this.sendSignedTransaction({ params, fallback });
                    default:
                        return fallback();
                }
            }
            catch (e) {
                (0, utils_1.logMessage)(`Request failed with error: ${JSON.stringify(e)}. Falling back to default provider`);
                return fallback();
            }
        });
    }
    handleRpcRequest({ method, params }) {
        return __awaiter(this, void 0, void 0, function* () {
            const fallback = () => { var _a, _b; return (_b = (_a = this.externalProvider).request) === null || _b === void 0 ? void 0 : _b.call(_a, { method, params }); };
            try {
                switch (method) {
                    case 'eth_sendTransaction':
                        return yield this.handleSendTransaction({ params, fallback });
                    case 'eth_sendRawTransaction':
                        return yield this.sendSignedTransaction({ params, fallback });
                    default:
                        return yield fallback();
                }
            }
            catch (e) {
                (0, utils_1.logMessage)(`Request failed with error: ${JSON.stringify(e)}. Falling back to default provider`);
                return fallback();
            }
        });
    }
    /**
     * Function to initialize the biconomy object with DApp information.
     * It fetches the dapp's smart contract from biconomy database
     * and initialize the decoders for each smart
     * contract which will be used to decode information during function calls.
     * */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.signer = this.ethersProvider.getSigner();
                yield this.getDappData();
                try {
                    if (!this.clientMessenger.socketClient.isConnected()) {
                        yield this.clientMessenger.connect();
                    }
                }
                catch (error) {
                    (0, utils_1.logMessage)(`Error while connecting to socket server ${JSON.stringify(error)}`);
                }
                const providerNetworkId = (yield this.ethersProvider.getNetwork()).chainId;
                if (providerNetworkId) {
                    if (providerNetworkId !== this.networkId) {
                        throw new Error(`Current networkId ${providerNetworkId} is different from dapp network id registered on mexa dashboard ${this.networkId}`);
                    }
                    yield this.getSystemInfo(providerNetworkId);
                }
                else {
                    throw new Error('Could not get network version');
                }
            }
            catch (error) {
                (0, utils_1.logMessage)(error);
                return error;
            }
        });
    }
    getDappData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${config_1.config.metaEntryPointBaseUrl}/api/v1/sdk/dapp/`, {
                    params: {
                        contractAddresses: this.contractAddresses,
                    },
                    headers: {
                        'x-api-key': this.apiKey,
                        'Content-Type': 'application/json;charset=utf-8',
                        version: config_1.config.PACKAGE_VERSION,
                    },
                });
                const { data } = response.data;
                const { dapp, smartContracts, metaApis } = data;
                this.networkId = parseInt(dapp.networkId, 10);
                this.dappId = dapp._id;
                if (smartContracts && smartContracts.length > 0) {
                    smartContracts.forEach((contract) => {
                        const contractInterface = new ethers_1.ethers.utils.Interface(JSON.parse(contract.abi.toString()));
                        this.smartContractMetaTransactionMap[contract.address.toLowerCase()] = contract.metaTransactionType;
                        this.interfaceMap[contract.address.toLowerCase()] = contractInterface;
                        this.smartContractMap[contract.address.toLowerCase()] = contract.abi.toString();
                    });
                }
                if (metaApis && metaApis.length > 0) {
                    metaApis.forEach((metaApi) => {
                        const { contractAddress, method } = metaApi;
                        this.dappApiMap[`${contractAddress.toLowerCase()}-${method}`] = metaApi;
                    });
                }
            }
            catch (error) {
                (0, utils_1.logErrorMessage)(error);
                throw error;
            }
        });
    }
    getTransactionStatus(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${config_1.config.metaEntryPointBaseUrl}/api/v1/sdk/transaction-status`, {
                    params: {
                        transactionId,
                    },
                    headers: {
                        'x-api-key': this.apiKey,
                        'Content-Type': 'application/json;charset=utf-8',
                        version: config_1.config.PACKAGE_VERSION,
                    },
                });
                const { data } = response.data;
                return Object.assign({ flag: config_1.BICONOMY_RESPONSE_CODES.SUCCESS }, data);
            }
            catch (error) {
                (0, utils_1.logErrorMessage)(error);
                return {
                    flag: config_1.BICONOMY_RESPONSE_CODES.ERROR_RESPONSE,
                    code: config_1.HTTP_CODES.INTERNAL_SERVER_ERROR,
                    error: (0, serialize_error_1.serializeError)(error),
                };
            }
        });
    }
}
exports.Biconomy = Biconomy;
//# sourceMappingURL=index.js.map
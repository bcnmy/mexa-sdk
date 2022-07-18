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
exports.sendSignedTransaction = void 0;
/* eslint-disable consistent-return */
const ethereum_tx_decoder_1 = __importDefault(require("ethereum-tx-decoder"));
const ethers_1 = require("ethers");
const config_1 = require("../config");
const utils_1 = require("../utils");
const meta_transaction_EIP2771_helpers_1 = require("./meta-transaction-EIP2771-helpers");
/**
 * Method used to handle transaction initiated using web3.eth.sendSignedTransaction method
 * It extracts rawTransaction from payload and decode it to get required information like from, to,
 * data, gasLimit to create the payload for biconomy meta transaction API.
 * In case of Native meta transaction, payload just contains rawTransaction
 * In case of contract based meta transaction, payload contains rawTransaction and signature wrapped
 * in a json object.
 *
 * @param {Object} this Reference to this SDK instance
 * @param {Object} payload Payload data
 */
function sendSignedTransaction(sendSignedTransactionParams) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!this.interfaceMap) {
                return {
                    error: 'Interface Map is undefined',
                    code: config_1.RESPONSE_CODES.INTERFACE_MAP_UNDEFINED,
                };
            }
            if (!this.dappApiMap) {
                return {
                    error: 'Dapp Api Map is undefined',
                    code: config_1.RESPONSE_CODES.DAPP_API_MAP_UNDEFINED,
                };
            }
            if (!this.smartContractMetaTransactionMap) {
                return {
                    error: 'Smart contract meta transaction map is undefined',
                    code: config_1.RESPONSE_CODES.SMART_CONTRACT_METATRANSACTION_MAP_UNDEFINED,
                };
            }
            if (!this.smartContractMap) {
                return {
                    error: 'Smart contract map is undefined',
                    code: config_1.RESPONSE_CODES.SMART_CONTRACT_MAP_UNDEFINED,
                };
            }
            if (!this.smartContractTrustedForwarderMap) {
                return {
                    error: 'Smart contract trusted forwarder map is undefined',
                    code: config_1.RESPONSE_CODES.SMART_CONTRACT_TRSUTED_FORWARDER_MAP_UNDEFINED,
                };
            }
            if (!this.forwarderDomainData) {
                return {
                    error: 'Forwarder domain data is undefined',
                    code: config_1.RESPONSE_CODES.FORWARDER_DOMAIN_DATA_UNDEFINED,
                };
            }
            if (!this.forwarderDomainDetails) {
                return {
                    error: 'Forwarder domain details is undefined',
                    code: config_1.RESPONSE_CODES.FORWARDER_DOMAIN_DETAILS_UNDEFINED,
                };
            }
            if (!this.forwarderAddresses) {
                return {
                    error: 'Forwarder Addresses array is undefined',
                    code: config_1.RESPONSE_CODES.FORWARDER_ADDRESSES_ARRAY_UNDEFINED,
                };
            }
            if (!this.forwarderAddress) {
                return {
                    error: 'Forwarder Address is undefined',
                    code: config_1.RESPONSE_CODES.FORWARDER_ADDRESS_UNDEFINED,
                };
            }
            const { fallback } = sendSignedTransactionParams;
            let { params } = sendSignedTransactionParams;
            if (params && params[0]) {
                const data = params[0];
                let rawTransaction;
                let signature;
                let request;
                let signatureType;
                let customDomainName;
                let customDomainVersion;
                if (typeof data === 'string') {
                    rawTransaction = data;
                }
                else if (typeof data === 'object') {
                    // Here user wrapped raw Transaction in json object along with signature
                    signature = data.signature;
                    rawTransaction = data.rawTransaction;
                    signatureType = data.signatureType;
                    request = data.forwardRequest;
                    customDomainName = data.domainName;
                    customDomainVersion = data.domainVersion;
                }
                if (rawTransaction) {
                    const decodedTx = ethereum_tx_decoder_1.default.decodeTx(rawTransaction);
                    if (decodedTx.to && decodedTx.data && decodedTx.value) {
                        const to = decodedTx.to.toLowerCase();
                        let methodInfo = (0, utils_1.decodeMethod)(to, decodedTx.data, this.interfaceMap);
                        if (!methodInfo) {
                            methodInfo = (0, utils_1.decodeMethod)(config_1.config.SCW, decodedTx.data, this.interfaceMap);
                            if (!methodInfo) {
                                if (this.strictMode) {
                                    const error = (0, utils_1.formatMessage)(config_1.RESPONSE_CODES.DASHBOARD_DATA_MISMATCH, `No smart contract wallet or smart contract registered on dashboard with address (${decodedTx.to})`);
                                    return error;
                                }
                                (0, utils_1.logMessage)('Strict mode is off so falling back to default provider for handling transaction');
                                if (typeof data === 'object' && data.rawTransaction) {
                                    params = [data.rawTransaction];
                                }
                            }
                        }
                        const methodName = methodInfo.name;
                        const api = this.dappApiMap[`${to}-${methodName}`];
                        const contractAddress = api.contractAddress.toLowerCase();
                        const metaTxApproach = this.smartContractMetaTransactionMap[contractAddress];
                        if (!api) {
                            (0, utils_1.logMessage)(`API not found for method ${methodName}`);
                            (0, utils_1.logMessage)(`Strict mode ${this.strictMode}`);
                            if (this.strictMode) {
                                const error = (0, utils_1.formatMessage)(config_1.RESPONSE_CODES.API_NOT_FOUND, `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`);
                                return error;
                            }
                            (0, utils_1.logMessage)('Falling back to default provider as strict mode is false in biconomy');
                            if (typeof data === 'object' && data.rawTransaction) {
                                params = [data.rawTransaction];
                            }
                            yield fallback();
                        }
                        (0, utils_1.logMessage)('API found');
                        const paramArray = [];
                        const parsedTransaction = ethers_1.ethers.utils.parseTransaction(rawTransaction);
                        const account = parsedTransaction ? parsedTransaction.from : undefined;
                        (0, utils_1.logMessage)(`signer is ${account}`);
                        if (!account) {
                            const error = (0, utils_1.formatMessage)(config_1.RESPONSE_CODES.ERROR_RESPONSE, 'Not able to get user account from signed transaction');
                            return error;
                        }
                        /**
                           * based on the api check contract meta transaction type
                           * change paramArray accordingly
                           * build request EDIT :
                           *  do not build the request again it will result in signature mismatch
                           * create domain separator based on signature type
                           * use already available signature
                           * send API call with appropriate parameters based on signature type
                           *
                           */
                        let gasLimitNum;
                        let { gasLimit } = decodedTx;
                        if (metaTxApproach !== this.defaultMetaTransaction) {
                            if (!gasLimit || parseInt(gasLimit, 10) === 0) {
                                const contractABI = this.smartContractMap[to];
                                if (contractABI) {
                                    const contract = new ethers_1.ethers.Contract(to, contractABI, this.readOnlyProvider ? this.readOnlyProvider : this.ethersProvider);
                                    gasLimit = yield contract.estimateGas[methodInfo.signature](...methodInfo.args, { from: account });
                                    // do not send this value in API call. only meant for txGas
                                    gasLimitNum = ethers_1.ethers.BigNumber.from(gasLimit.toString())
                                        .add(ethers_1.ethers.BigNumber.from(5000))
                                        .toNumber();
                                    (0, utils_1.logMessage)(`gas limit number${gasLimitNum}`);
                                }
                            }
                            else {
                                gasLimitNum = ethers_1.ethers.BigNumber.from(gasLimit.toString()).toNumber();
                            }
                            (0, utils_1.logMessage)(request);
                            paramArray.push(request);
                            const forwarderToUse = yield (0, meta_transaction_EIP2771_helpers_1.findTheRightForwarder)({
                                to,
                                smartContractTrustedForwarderMap: this.smartContractTrustedForwarderMap,
                                provider: this.readOnlyProvider ? this.readOnlyProvider : this.ethersProvider,
                                forwarderAddresses: this.forwarderAddresses,
                                forwarderAddress: this.forwarderAddress,
                            });
                            this.smartContractTrustedForwarderMap[to] = forwarderToUse;
                            // Update the verifyingContract in domain data
                            this.forwarderDomainData.verifyingContract = forwarderToUse;
                            const domainDataToUse = this.forwarderDomainDetails[parseInt(forwarderToUse, 10)];
                            if (customDomainName) {
                                domainDataToUse.name = customDomainName.toString();
                            }
                            if (customDomainVersion) {
                                domainDataToUse.version = customDomainVersion.toString();
                            }
                            // Update the verifyingContract field of domain data based on the current request
                            if (signatureType && signatureType === this.eip712Sign) {
                                const domainSeparator = (0, meta_transaction_EIP2771_helpers_1.getDomainSeperator)(domainDataToUse);
                                (0, utils_1.logMessage)(domainSeparator);
                                paramArray.push(domainSeparator);
                            }
                            paramArray.push(signature);
                            const trustedForwarderMetaTransactionData = {
                                from: account,
                                apiId: api === null || api === void 0 ? void 0 : api.apiId,
                                params: paramArray,
                                to,
                                signatureType: signatureType ? this.eip712Sign : this.personalSign,
                            };
                            return yield this.sendTransaction(account, trustedForwarderMetaTransactionData, fallback);
                        }
                        paramArray.push(...methodInfo.args);
                        const defaultMetaTransactionData = {
                            from: account,
                            apiId: api === null || api === void 0 ? void 0 : api.apiId,
                            params: paramArray,
                            gasLimit: decodedTx.gasLimit.toString(),
                            to: decodedTx.to.toLowerCase(),
                        };
                        return yield this.sendTransaction(account, defaultMetaTransactionData, fallback);
                    }
                    const error = (0, utils_1.formatMessage)(config_1.RESPONSE_CODES.INVALID_PAYLOAD, 'Not able to decode the data in rawTransaction using ethereum-tx-decoder. Please check the data sent.');
                    return error;
                }
                const error = (0, utils_1.formatMessage)(config_1.RESPONSE_CODES.INVALID_PAYLOAD, `Invalid payload data ${JSON.stringify(params[0])}.rawTransaction is required in param object`);
                return error;
            }
            const error = (0, utils_1.formatMessage)(config_1.RESPONSE_CODES.INVALID_PAYLOAD, `Invalid payload data ${JSON.stringify(params)}. Non empty Array expected in params key`);
            return error;
        }
        catch (error) {
            (0, utils_1.logMessage)(error);
            return error;
        }
    });
}
exports.sendSignedTransaction = sendSignedTransaction;
//# sourceMappingURL=send-signed-transaction-helper.js.map
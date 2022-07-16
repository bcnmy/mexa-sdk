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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSendTransaction = void 0;
const ethers_1 = require("ethers");
const utils_1 = require("../utils");
const meta_transaction_EIP2771_helpers_1 = require("./meta-transaction-EIP2771-helpers");
/**
  * Function decodes the parameter in payload and gets the user signature using eth_signTypedData_v4
  * method and send the request to biconomy for processing and call the callback method 'end'
  * with transaction hash.
  * This is an internal function that is called
  * while intercepting eth_sendTransaction RPC method call.
* */
function handleSendTransaction(handleSendTransactionParams) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!this.interfaceMap) {
                throw new Error('Interface Map is undefined');
            }
            if (!this.dappApiMap) {
                throw new Error('Dapp Api Map is undefined');
            }
            if (!this.smartContractMetaTransactionMap) {
                throw new Error('Smart contract meta transaction map is undefined');
            }
            if (!this.smartContractTrustedForwarderMap) {
                throw new Error('Smart contract trusted forwarder map is undefined');
            }
            if (!this.smartContractMap) {
                throw new Error('Smart contract map is undefined');
            }
            if (!this.forwarderDomainData) {
                throw new Error('Forwarder domain data is undefined');
            }
            if (!this.forwarderDomainDetails) {
                throw new Error('Forwarder domain details is undefined');
            }
            if (!this.biconomyForwarder) {
                throw new Error('Biconomy forwarder contract is undefined');
            }
            if (!this.forwarderAddresses) {
                throw new Error('Forwarder Addresses array is undefined');
            }
            if (!this.forwarderAddress) {
                throw new Error('Forwarder Address is undefined');
            }
            const { params, fallback, } = handleSendTransactionParams;
            if (params && params[0] && params[0].to) {
                const to = params[0].to.toLowerCase();
                if (this.interfaceMap[to]) {
                    const methodInfo = (0, utils_1.decodeMethod)(to, params[0].data, this.interfaceMap);
                    if (!methodInfo) {
                        throw new Error('Can\'t decode method information from payload. Make sure you have uploaded correct ABI on Biconomy Dashboard');
                    }
                    const methodName = methodInfo.name;
                    const api = this.dappApiMap[`${to}-${methodName}`];
                    // Information we get here is contractAddress, methodName, methodType, ApiId
                    let customBatchId;
                    let customDomainName;
                    let customDomainVersion;
                    let signTypedDataType;
                    const contractAddress = api.contractAddress.toLowerCase();
                    const metaTxApproach = this.smartContractMetaTransactionMap[contractAddress];
                    // Sanitise gas limit here. big number / hex / number -> hex
                    let gasLimit = params[0].gas || params[0].gasLimit;
                    if (gasLimit) {
                        gasLimit = ethers_1.ethers.BigNumber.from(gasLimit.toString()).toHexString();
                    }
                    let { txGas } = params[0];
                    const { signatureType } = params[0];
                    if (params[0].batchId) {
                        customBatchId = Number(params[0].batchId);
                    }
                    if (params[0].domainName) {
                        customDomainName = params[0].domainName;
                    }
                    if (params[0].domainVersion) {
                        customDomainVersion = params[0].domainVersion;
                    }
                    if (params[0].signTypedDataType) {
                        signTypedDataType = params[0].signTypedDataType;
                    }
                    (0, utils_1.logMessage)(params[0]);
                    (0, utils_1.logMessage)(`gas limit : ${gasLimit}`);
                    if (txGas) {
                        (0, utils_1.logMessage)(`tx gas supplied : ${txGas}`);
                    }
                    if (!api) {
                        (0, utils_1.logMessage)(`API not found for method ${methodName}`);
                        (0, utils_1.logMessage)(`Strict mode ${this.strictMode}`);
                        if (this.strictMode) {
                            throw new Error(`Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`);
                        }
                        (0, utils_1.logMessage)('Falling back to default provider as strict mode is false in biconomy');
                        return yield fallback();
                    }
                    (0, utils_1.logMessage)('API found');
                    (0, utils_1.logMessage)('Getting user account');
                    const account = params[0].from;
                    if (!account) {
                        throw new Error('Not able to get user account');
                    }
                    (0, utils_1.logMessage)('User account fetched');
                    (0, utils_1.logMessage)(methodInfo.args);
                    const paramArray = [];
                    if (metaTxApproach === this.trustedForwarderMetaTransaction) {
                        let gasLimitNum;
                        (0, utils_1.logMessage)('Smart contract is configured to use Trusted Forwarder as meta transaction type');
                        const forwardedData = params[0].data;
                        const signatureFromPayload = params[0].signature;
                        // Check if txGas is present, if not calculate gas limit for txGas
                        if (!txGas || parseInt(txGas, 10) === 0) {
                            const contractAbi = this.smartContractMap[to];
                            if (contractAbi) {
                                const contract = new ethers_1.ethers.Contract(to, contractAbi, this.readOnlyProvider ? this.readOnlyProvider : this.ethersProvider);
                                txGas = yield contract.estimateGas[methodInfo.signature](...methodInfo.args, { from: account });
                                // do not send this value in API call. only meant for txGas
                                gasLimitNum = ethers_1.ethers.BigNumber.from(txGas.toString())
                                    .add(ethers_1.ethers.BigNumber.from(5000))
                                    .toNumber();
                                (0, utils_1.logMessage)(`Gas limit (txGas) calculated for method ${methodName} in SDK: ${gasLimitNum}`);
                            }
                            else {
                                throw new Error('Smart contract ABI not found!');
                            }
                        }
                        else {
                            (0, utils_1.logMessage)(`txGas supplied for this Trusted Forwarder call is ${Number(txGas)}`);
                            gasLimitNum = ethers_1.ethers.BigNumber.from(txGas.toString()).toNumber();
                            (0, utils_1.logMessage)(`gas limit number for txGas ${gasLimitNum}`);
                        }
                        const forwarderToAttach = ethers_1.ethers.utils.getAddress(yield (0, meta_transaction_EIP2771_helpers_1.findTheRightForwarder)({
                            to,
                            smartContractTrustedForwarderMap: this.smartContractTrustedForwarderMap,
                            provider: this.readOnlyProvider ? this.readOnlyProvider : this.ethersProvider,
                            forwarderAddresses: this.forwarderAddresses,
                            forwarderAddress: this.forwarderAddress,
                        }));
                        const { request } = yield (0, meta_transaction_EIP2771_helpers_1.buildForwardTxRequest)(account, to, gasLimitNum, // txGas
                        forwardedData, this.biconomyForwarder.attach(forwarderToAttach), customBatchId);
                        (0, utils_1.logMessage)(JSON.stringify(request));
                        paramArray.push(request);
                        this.forwarderDomainData.verifyingContract = forwarderToAttach;
                        const domainDataToUse = this.forwarderDomainData;
                        if (customDomainName) {
                            domainDataToUse.name = customDomainName.toString();
                        }
                        if (customDomainVersion) {
                            domainDataToUse.version = customDomainVersion.toString();
                        }
                        if (signatureType && signatureType === this.eip712Sign) {
                            (0, utils_1.logMessage)('EIP712 signature flow');
                            // Update the verifyingContract field of domain data based on the current request
                            const domainSeparator = (0, meta_transaction_EIP2771_helpers_1.getDomainSeperator)(domainDataToUse);
                            (0, utils_1.logMessage)('Domain separator to be used:');
                            (0, utils_1.logMessage)(domainSeparator);
                            paramArray.push(domainSeparator);
                            let signatureEIP712;
                            if (signatureFromPayload) {
                                signatureEIP712 = signatureFromPayload;
                                (0, utils_1.logMessage)(`EIP712 signature from payload is ${signatureEIP712}`);
                            }
                            else {
                                signatureEIP712 = yield this.getSignatureEIP712(account, request, domainDataToUse, signTypedDataType);
                                (0, utils_1.logMessage)(`EIP712 signature is ${signatureEIP712}`);
                            }
                            paramArray.push(signatureEIP712);
                        }
                        else {
                            (0, utils_1.logMessage)('Personal signature flow');
                            let signaturePersonal;
                            if (signatureFromPayload) {
                                signaturePersonal = signatureFromPayload;
                                (0, utils_1.logMessage)(`Personal signature from payload is ${signaturePersonal}`);
                            }
                            else {
                                signaturePersonal = yield this.getSignaturePersonal(request);
                                (0, utils_1.logMessage)(`Personal signature is ${signaturePersonal}`);
                            }
                            if (signaturePersonal) {
                                paramArray.push(signaturePersonal);
                            }
                            else {
                                throw new Error('Could not get personal signature while processing transaction in Mexa SDK. Please check the providers you have passed to Biconomy');
                            }
                        }
                        const data = {
                            from: account,
                            apiId: api.apiId,
                            params: paramArray,
                            to,
                            gasLimit,
                            signatureType: signatureType && signatureType === this.eip712Sign
                                ? this.eip712Sign : this.personalSign,
                        };
                        return yield this.sendTransaction(account, data, fallback);
                    }
                    paramArray.push(...methodInfo.args);
                    const data = {
                        from: account,
                        apiId: api.apiId,
                        params: paramArray,
                        gasLimit,
                        to,
                    };
                    return yield this.sendTransaction(account, data, fallback);
                }
                if (this.strictMode) {
                    throw new Error(`Make sure your have smart contract with address ${to} is registered on the dashboard`);
                }
                (0, utils_1.logMessage)(`Smart contract with address ${to} not found on dashbaord. Strict mode is off, so falling back to normal transaction mode`);
                return yield fallback();
            }
            throw new Error(`Invalid payload data ${JSON.stringify(params)}. Expecting params key to be an array with first element having a 'to' property`);
        }
        catch (error) {
            (0, utils_1.logErrorMessage)(error);
            return error;
        }
    });
}
exports.handleSendTransaction = handleSendTransaction;
//# sourceMappingURL=handle-send-transaction-helper.js.map
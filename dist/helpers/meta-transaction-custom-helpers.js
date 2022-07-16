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
exports.buildSignatureCustomPersonalSignMetaTransaction = exports.buildSignatureCustomEIP712MetaTransaction = void 0;
const config_1 = require("../config");
const signature_helpers_1 = require("./signature-helpers");
function buildSignatureCustomEIP712MetaTransaction(userAddress, nonce, functionSignature, domainData) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = {
            userAddress,
            nonce,
            functionSignature,
        };
        const dataToSign = JSON.stringify({
            types: {
                EIP712Domain: config_1.domainType,
                MetaTransaction: config_1.metaTransactionType,
            },
            domain: domainData,
            primaryType: 'MetaTransaction',
            message,
        });
        // Review provider
        const signature = yield this.ethersProvider.send('eth_signTypedData_v4', [
            userAddress,
            dataToSign,
        ]);
        return (0, signature_helpers_1.getSignatureParameters)(signature);
    });
}
exports.buildSignatureCustomEIP712MetaTransaction = buildSignatureCustomEIP712MetaTransaction;
function buildSignatureCustomPersonalSignMetaTransaction(nonce, functionSignature) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.contractAddresses) {
            throw new Error('Contract Addresses array is undefined');
        }
        const signatureParamtersPerContractAddress = {};
        this.contractAddresses.forEach((contractAddress) => __awaiter(this, void 0, void 0, function* () {
            if (!this.networkId) {
                throw new Error('NetworkId is undefined');
            }
            if (!this.signer) {
                throw new Error('Signer not found');
            }
            const messageToSign = (0, signature_helpers_1.getPersonalCustomMessageToSign)({
                nonce,
                functionSignature,
                chainId: this.networkId,
                contractAddress,
            });
            const signature = yield this.signer.signMessage(`0x${messageToSign.toString('hex')}`);
            signatureParamtersPerContractAddress[contractAddress] = (0, signature_helpers_1.getSignatureParameters)(signature);
        }));
    });
}
exports.buildSignatureCustomPersonalSignMetaTransaction = buildSignatureCustomPersonalSignMetaTransaction;
//# sourceMappingURL=meta-transaction-custom-helpers.js.map
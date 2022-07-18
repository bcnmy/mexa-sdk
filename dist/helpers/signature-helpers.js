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
exports.getSignaturePersonal = exports.getPersonalCustomMessageToSign = exports.getPersonalForwardMessageToSign = exports.getSignatureEIP712 = exports.getEIP712ForwardMessageToSign = exports.getSignatureParameters = void 0;
const ethers_1 = require("ethers");
const ethereumjs_abi_1 = __importDefault(require("ethereumjs-abi"));
const ethereumjs_util_1 = require("ethereumjs-util");
const config_1 = require("../config");
const utils_1 = require("../utils");
/**
 * Method to get the signature parameters.
 * @param signature String representing a signature
 * */
const getSignatureParameters = (signature) => {
    if (!ethers_1.ethers.utils.isHexString(signature)) {
        throw new Error('Given value "'.concat(signature, '" is not a valid hex string.'));
    }
    const r = signature.slice(0, 66);
    const s = '0x'.concat(signature.slice(66, 130));
    let v = '0x'.concat(signature.slice(130, 132));
    v = ethers_1.ethers.BigNumber.from(v).toNumber();
    if (![27, 28].includes(v))
        v += 27;
    return {
        r,
        s,
        v,
    };
};
exports.getSignatureParameters = getSignatureParameters;
function getEIP712ForwardMessageToSign(forwarderDomainDetails, forwarderDomainType, forwardRequestType, request, domainData) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!forwarderDomainDetails
            || Object.keys(forwarderDomainDetails).length === 0) {
            throw new Error('Biconomy is not properly initialized');
        }
        // Override domainData
        const domainDataToUse = domainData;
        // Might update version as well
        const dataToSign = JSON.stringify({
            types: {
                EIP712Domain: forwarderDomainType,
                ERC20ForwardRequest: forwardRequestType,
            },
            domain: domainDataToUse,
            primaryType: 'ERC20ForwardRequest',
            message: request,
        });
        return dataToSign;
    });
}
exports.getEIP712ForwardMessageToSign = getEIP712ForwardMessageToSign;
// take parameter for chosen signature type V3 or V4
function getSignatureEIP712(account, request, domainData, type) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.forwarderDomainDetails) {
            return {
                error: 'Forwarder domain details is undefined',
                code: config_1.RESPONSE_CODES.FORWARDER_DOMAIN_DETAILS_UNDEFINED,
            };
        }
        if (!this.forwarderDomainType) {
            return {
                error: 'Forwarder domain type is undefined',
                code: config_1.RESPONSE_CODES.FORWARDER_DOMAIN_TYPE_UNDEFINED,
            };
        }
        if (!this.forwardRequestType) {
            return {
                error: 'Forwarder request type is undefined',
                code: config_1.RESPONSE_CODES.FORWARDER_REQUEST_TYPE_UNDEFINED,
            };
        }
        // default V4 now
        let signTypedDataType = 'eth_signTypedData_v4';
        if (type === 'v3' || type === 'V3') {
            signTypedDataType = 'eth_signTypedData_v3';
        }
        const dataToSign = yield getEIP712ForwardMessageToSign(this.forwarderDomainDetails, this.forwarderDomainType, this.forwardRequestType, request, domainData);
        const { ethersProvider } = this;
        try {
            const signature = yield ethersProvider.send(signTypedDataType, [
                account,
                dataToSign,
            ]);
            const { r, s, v } = (0, exports.getSignatureParameters)(signature);
            const vNum = ethers_1.ethers.BigNumber.from(v).toHexString();
            const newSignature = r + s.slice(2) + vNum.slice(2);
            return newSignature;
        }
        catch (error) {
            (0, utils_1.logMessage)('error inside signature');
            (0, utils_1.logMessage)(error);
            return '';
        }
    });
}
exports.getSignatureEIP712 = getSignatureEIP712;
function getPersonalForwardMessageToSign(request) {
    return ethereumjs_abi_1.default.soliditySHA3([
        'address',
        'address',
        'address',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bytes32',
    ], [
        request.from,
        request.to,
        request.token,
        request.txGas,
        request.tokenGasPrice,
        request.batchId,
        request.batchNonce,
        request.deadline,
        ethers_1.ethers.utils.keccak256(request.data),
    ]);
}
exports.getPersonalForwardMessageToSign = getPersonalForwardMessageToSign;
function getPersonalCustomMessageToSign(request) {
    return ethereumjs_abi_1.default.soliditySHA3(['uint256', 'address', 'uint256', 'bytes'], [request.nonce, request.contractAddress, request.chainId, (0, ethereumjs_util_1.toBuffer)(request.functionSignature)]);
}
exports.getPersonalCustomMessageToSign = getPersonalCustomMessageToSign;
/**
 * Method to get the signature parameters.
 * @param engine Object containing the signer, walletprovider and originalprovider
 * @param request Object containing the request parameters
 * */
function getSignaturePersonal(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const hashToSign = getPersonalForwardMessageToSign(request);
        let signature;
        // eslint-disable-next-line no-async-promise-executor
        const promise = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.signer) {
                    throw new Error('Signer not found');
                }
                signature = yield this.signer.signMessage(ethers_1.ethers.utils.arrayify(hashToSign));
                const { r, s, v } = (0, exports.getSignatureParameters)(signature);
                const vNum = ethers_1.ethers.BigNumber.from(v).toHexString();
                const newSignature = r + s.slice(2) + vNum.slice(2);
                resolve(newSignature);
            }
            catch (error) {
                reject(error);
            }
        }));
        return promise;
    });
}
exports.getSignaturePersonal = getSignaturePersonal;
//# sourceMappingURL=signature-helpers.js.map
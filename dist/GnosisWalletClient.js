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
exports.GnosisWalletClient = void 0;
const ethers_1 = require("ethers");
const axios_1 = __importDefault(require("axios"));
const abis_1 = require("./abis");
const config_1 = require("./config");
const getSignatureParameters = (signature) => {
    if (!ethers_1.ethers.utils.isHexString(signature)) {
        throw new Error('Given value "'.concat(signature, '" is not a valid hex string.'));
    }
    const r = signature.slice(0, 66);
    const s = '0x'.concat(signature.slice(66, 130));
    let v = ethers_1.ethers.BigNumber.from('0x'.concat(signature.slice(130, 132))).toNumber();
    if (![27, 28].includes(v))
        v += 27;
    return {
        r,
        s,
        v,
    };
};
class GnosisWalletClient {
    constructor(gnosisClientParameters) {
        const { ethersProvider, gnosisSafeProxyFactoryAddress, gnosisSafeAddress, networkId, apiKey, } = gnosisClientParameters;
        this.ethersProvider = ethersProvider;
        this.networkId = networkId;
        this.apiKey = apiKey;
        this.gnosisSafeProxyFactoryAddress = gnosisSafeProxyFactoryAddress;
        this.gnosisSafeAddress = gnosisSafeAddress;
        this.safeMasterCopy = new ethers_1.ethers.Contract(this.gnosisSafeAddress, abis_1.gnosisSafeAbi, this.ethersProvider);
        this.gnosisFactory = new ethers_1.ethers.Contract(this.gnosisSafeProxyFactoryAddress, abis_1.gnosisSafeProxyFactoryAbi, this.ethersProvider);
    }
    deployGnosisSafe(deployGnosisSafeParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const { ownerAddress } = deployGnosisSafeParams;
            const creationData = this.safeMasterCopy.setup([ownerAddress], 1, '0x0000000000000000000000000000000000000000', '0x0', '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', 0, '0x0000000000000000000000000000000000000000').encodeABI();
            // TODO check return value
            const tx = this.gnosisFactory.createProxy(this.gnosisSafeAddress, creationData);
            return tx;
        });
    }
    whitelistTargetContract(authToken, contractAddresses) {
        return __awaiter(this, void 0, void 0, function* () {
            yield axios_1.default.post(`${config_1.config.metaEntryPointBaseUrl}/api/v1/sdk/dapp/gnosis/whitelist-target`, {
                contractAddresses,
            }, {
                headers: {
                    'Content-Type': 'application/json;charset=utf-8',
                    authToken,
                    apiKey: this.apiKey,
                    version: config_1.config.PACKAGE_VERSION,
                },
            });
        });
    }
    sendGnosisSafeTransaction(sendGnosisSafeTransactionParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const { execTransactionBody, signatureType, ownerAddress, walletAddress, } = sendGnosisSafeTransactionParams;
            let { signature } = sendGnosisSafeTransactionParams;
            if (!signature) {
                if (signatureType === 'PERSONAL_SIGN') {
                    const nonce = yield this.safeMasterCopy.nonce();
                    const transactionHash = yield this.safeMasterCopy.getTransactionHash(execTransactionBody.to, execTransactionBody.valueWei, execTransactionBody.data, execTransactionBody.operation, execTransactionBody.txGasEstimate, execTransactionBody.baseGasEstimate, execTransactionBody.gasPrice, execTransactionBody.gasToken, execTransactionBody.executor, nonce);
                    signature = yield this.ethersProvider.send('personal_sign', [ownerAddress, transactionHash]);
                    const { r, s, v } = getSignatureParameters(signature);
                    signature = `${r}${s.substring(2)}${Number(v + 4).toString(16)}`;
                }
                else {
                    signature = yield this.ethersProvider.getSigner()._signTypedData({ verifyingContract: walletAddress, chainId: this.networkId }, config_1.config.EIP712_SAFE_TX_TYPE, execTransactionBody);
                }
            }
            const transaction = yield this.safeMasterCopy.execTransaction(execTransactionBody.to, execTransactionBody.valueWei, execTransactionBody.data, execTransactionBody.operation, execTransactionBody.txGasEstimate, execTransactionBody.baseGasEstimate, execTransactionBody.gasPrice, execTransactionBody.gasToken, execTransactionBody.executor, signature);
            return transaction;
        });
    }
}
exports.GnosisWalletClient = GnosisWalletClient;
//# sourceMappingURL=GnosisWalletClient.js.map
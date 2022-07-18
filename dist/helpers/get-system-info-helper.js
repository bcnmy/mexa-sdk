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
exports.getSystemInfo = void 0;
/* eslint-disable consistent-return */
const ethers_1 = require("ethers");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const utils_1 = require("../utils");
const abis_1 = require("../abis");
const types_1 = require("../common/types");
const domainData = {
    name: config_1.config.eip712DomainName,
    version: config_1.config.eip712SigVersion,
    verifyingContract: config_1.config.eip712VerifyingContract,
    chainId: 0,
};
function getSystemInfo(providerNetworkId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            domainData.chainId = providerNetworkId;
            (0, utils_1.logMessage)('Making system info call to get contract addresses');
            const response = yield axios_1.default.get(`${config_1.config.metaEntryPointBaseUrl}/api/v1/systemInfo/?networkId=${providerNetworkId}`, {
                headers: {
                    'Content-Type': 'application/json;charset=utf-8',
                    version: config_1.config.PACKAGE_VERSION,
                },
            });
            const systemInfoResponse = response.data.response;
            if (systemInfoResponse.code === '200' && systemInfoResponse.data) {
                const systemInfo = systemInfoResponse.data;
                this.forwarderDomainType = systemInfo.forwarderDomainType;
                this.defaultMetaTransaction = types_1.ContractMetaTransactionType.DEFAULT;
                this.trustedForwarderMetaTransaction = types_1.ContractMetaTransactionType.EIP2771;
                this.forwardRequestType = systemInfo.forwardRequestType;
                this.forwarderDomainData = systemInfo.forwarderDomainData;
                this.forwarderDomainDetails = systemInfo.forwarderDomainDetails;
                this.forwarderAddress = systemInfo.biconomyForwarderAddress;
                this.forwarderAddresses = systemInfo.biconomyForwarderAddresses;
                this.eip712Sign = systemInfo.eip712Sign;
                this.personalSign = systemInfo.personalSign;
                this.walletFactoryAddress = systemInfo.walletFactoryAddress;
                this.baseWalletAddress = systemInfo.baseWalletAddress;
                this.entryPointAddress = systemInfo.entryPointAddress;
                this.handlerAddress = systemInfo.handlerAddress;
                this.gnosisSafeProxyFactoryAddress = systemInfo.gnosisSafeProxyFactoryAddress;
                this.gnosisSafeAddress = systemInfo.gnosisSafeAddress;
                if (this.forwarderAddress && this.forwarderAddress !== '') {
                    this.biconomyForwarder = new ethers_1.ethers.Contract(this.forwarderAddress, abis_1.biconomyForwarderAbi, this.ethersProvider);
                }
            }
            else {
                (0, utils_1.logMessage)(`System info response: ${JSON.stringify(systemInfoResponse)}`);
                throw new Error('System info API call failed');
            }
        }
        catch (error) {
            (0, utils_1.logErrorMessage)(error);
        }
    });
}
exports.getSystemInfo = getSystemInfo;
//# sourceMappingURL=get-system-info-helper.js.map
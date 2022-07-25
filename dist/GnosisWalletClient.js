"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
/* eslint-disable import/no-cycle */
const ethers_1 = require("ethers");
const axios_1 = __importDefault(require("axios"));
const safe_ethers_lib_1 = __importDefault(require("@gnosis.pm/safe-ethers-lib"));
const safe_web3_lib_1 = __importDefault(require("@gnosis.pm/safe-web3-lib"));
const web3_1 = __importDefault(require("web3"));
const safe_core_sdk_1 = __importStar(require("@gnosis.pm/safe-core-sdk"));
const config_1 = require("./config");
class GnosisWalletClient {
    constructor(gnosisClientParameters) {
        const { biconomyProvider, networkId, apiKey, } = gnosisClientParameters;
        this.biconomyProvider = biconomyProvider;
        this.networkId = networkId;
        this.apiKey = apiKey;
    }
    setEthersAdapter(userAddress, rpcUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (rpcUrl) {
                const web3 = new web3_1.default.providers.HttpProvider(rpcUrl);
                this.ethAdapter = new safe_web3_lib_1.default({
                    web3,
                    signerAddress: userAddress,
                });
                return true;
            }
            this.ethAdapter = new safe_ethers_lib_1.default({
                ethers: ethers_1.ethers,
                signer: this.biconomyProvider.getSignerByAddress(userAddress),
            });
            return true;
        });
    }
    createNewGnosisSafe(safeAccountConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.ethAdapter) {
                this.safeFactory = yield safe_core_sdk_1.SafeFactory.create({ ethAdapter: this.ethAdapter });
                this.safeSdk = yield this.safeFactory.deploySafe({ safeAccountConfig });
                return this.safeSdk;
            }
            throw new Error('No adapter set. Please set ethers adapter using setEthersAdapter()');
        });
    }
    connectToGnosisSafe(safeAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.ethAdapter) {
                this.safeSdk = yield safe_core_sdk_1.default.create({ ethAdapter: this.ethAdapter, safeAddress });
                return this.safeSdk;
            }
            throw new Error('No adapter set. Please set ethers adapter using setEthersAdapter()');
        });
    }
    executeSafeTransaction(safeTransaction, gasLimit) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.ethAdapter && this.safeSdk) {
                const safeTransactionResponse = yield this.safeSdk.executeTransaction(safeTransaction, { gasLimit });
                return safeTransactionResponse;
            }
            throw new Error('Please set up ethAdapter and safeSdk before executing safe transaction.');
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
}
exports.GnosisWalletClient = GnosisWalletClient;
//# sourceMappingURL=GnosisWalletClient.js.map
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
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
class GnosisWalletClient {
    constructor(gnosisClientParameters) {
        const { biconomyProvider, networkId, apiKey, } = gnosisClientParameters;
        this.biconomyProvider = biconomyProvider;
        this.networkId = networkId;
        this.apiKey = apiKey;
    }
    createNewGnosisSafe() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    connectToGnosisSafe() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    buildSafeTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    executeSafeTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    executeMultiSendSafeTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
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
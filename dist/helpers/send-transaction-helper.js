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
exports.sendTransaction = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const utils_1 = require("../utils");
const client_messaging_helper_1 = require("./client-messaging-helper");
/**
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param this Object representing biconomy provider this
 * @param account User selected account on current wallet
 * @param data Data to be sent to biconomy server having transaction data
 * */
function sendTransaction(account, data, fallback) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!this || !account || !data) {
                return undefined;
            }
            const url = `${config_1.config.metaEntryPointBaseUrl}/api/v1/native`;
            const jsonData = JSON.stringify(data);
            const options = {
                url,
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json;charset=utf-8',
                    version: config_1.config.PACKAGE_VERSION,
                },
                timeout: 600000, // 10 min
            };
            (0, utils_1.logMessage)('request body');
            (0, utils_1.logMessage)(jsonData);
            const result = yield axios_1.default.post(url, jsonData, options);
            (0, utils_1.logMessage)(result);
            if (result.data
                && result.data.transactionId
                && result.status === config_1.BICONOMY_RESPONSE_CODES.SUCCESS) {
                (0, client_messaging_helper_1.mexaSdkClientMessenger)(this, {
                    transactionId: result.data.transactionId,
                });
                return {
                    transactionId: result.data.transactionId,
                };
            }
            if (result.status === config_1.BICONOMY_RESPONSE_CODES.BAD_REQUEST) {
                yield fallback();
                return {
                    transactionId: result.data.transactionId,
                };
            }
            const error = {};
            error.code = result.status;
            error.message = result.statusText || 'Error in native meta api call';
            return {
                error: error.toString(),
                transcionId: result.data.transactionId,
            };
        }
        catch (error) {
            (0, utils_1.logErrorMessage)(error);
            return error;
        }
    });
}
exports.sendTransaction = sendTransaction;
//# sourceMappingURL=send-transaction-helper.js.map
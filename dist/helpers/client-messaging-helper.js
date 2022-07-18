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
exports.mexaSdkClientMessenger = void 0;
/* eslint-disable consistent-return */
const utils_1 = require("../utils");
const mexaSdkClientMessenger = (engine, transactionData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { transactionId } = transactionData;
        engine.clientMessenger.createTransactionNotifier(transactionId, {
            onMined: (tx) => {
                (0, utils_1.logMessage)(`Tx Hash mined message received at client with id ${tx.transactionId} and hash ${tx.transactionHash}`);
                engine.emit('txMined', {
                    msg: 'txn mined',
                    id: tx.transactionId,
                    hash: tx.transactionHash,
                    receipt: tx.receipt,
                });
            },
            onHashGenerated: (tx) => {
                (0, utils_1.logMessage)(`Tx Hash generated message received at client ${tx.transactionId} and hash ${tx.transactionHash}`);
                engine.emit('txHashGenerated', {
                    msg: 'txn hash generated',
                    id: tx.transactionId,
                    hash: tx.transactionHash,
                });
            },
            onError: (errorResponseData) => {
                (0, utils_1.logMessage)(`Error message received at client\n ${errorResponseData.error}`);
                engine.emit('onError', {
                    error: errorResponseData.error,
                    transactionId: errorResponseData.transactionId,
                });
            },
            onHashChanged: (tx) => {
                (0, utils_1.logMessage)(`Tx Hash changed message received at client ${tx.transactionId} and hash ${tx.transactionHash}`);
                engine.emit('txHashChanged', {
                    msg: 'txn hash changed',
                    id: tx.transactionId,
                    hash: tx.transactionHash,
                });
            },
        });
    }
    catch (error) {
        (0, utils_1.logErrorMessage)(error);
    }
});
exports.mexaSdkClientMessenger = mexaSdkClientMessenger;
//# sourceMappingURL=client-messaging-helper.js.map
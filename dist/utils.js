"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeMethod = exports.validateOptions = exports.formatMessage = exports.getFetchOptions = exports.logErrorMessage = exports.logMessage = void 0;
const serialize_error_1 = require("serialize-error");
const logMessage = (message) => {
    console.log(message);
};
exports.logMessage = logMessage;
const logErrorMessage = (errorMessage) => {
    console.error((0, serialize_error_1.serializeError)(errorMessage));
};
exports.logErrorMessage = logErrorMessage;
const getFetchOptions = (method, apiKey, data) => ({
    method,
    headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json;charset=utf-8',
    },
    body: data,
});
exports.getFetchOptions = getFetchOptions;
const formatMessage = (code, message) => ({ code, message });
exports.formatMessage = formatMessage;
/**
 * Validate parameters passed to biconomy object. Dapp id and api key are mandatory.
 * */
const validateOptions = (options) => {
    if (!options) {
        throw new Error('Options object needs to be passed to Biconomy Object with apiKey as mandatory key');
    }
    if (!options.apiKey) {
        throw new Error('apiKey is required in options object when creating Biconomy object');
    }
    if (!options.contractAddresses) {
        throw new Error('contractAddresses is required in options object when creating Biconomy object');
    }
};
exports.validateOptions = validateOptions;
const decodeMethod = (to, data, interfaceMap) => {
    if (to && data && interfaceMap[to]) {
        return interfaceMap[to].parseTransaction({ data });
    }
    throw new Error('to, data or interfaceMap are undefined');
};
exports.decodeMethod = decodeMethod;
//# sourceMappingURL=utils.js.map
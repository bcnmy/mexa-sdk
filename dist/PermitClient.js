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
exports.PermitClient = void 0;
/* eslint-disable max-len */
/* eslint-disable import/no-cycle */
const ethers_1 = require("ethers");
const abis_1 = require("./abis");
const config_1 = require("./config");
const utils_1 = require("./utils");
/**
 * Class to provide methods to give token transfer permissions to Biconomy's ERC20Forwarder smart contract
 * ERC20Forwarder contract is responsible to calculate gas cost in ERC20 tokens and making a transfer on user's behalf
 * For DAI token there is a special permit method provided
 * For Tokens that support EIP2612 standard (like USDC) users should use eip2612Permit
 * Check https://docs.biconomy.io to see examples of how to use permit client to give one time token approvals
 */
class PermitClient {
    constructor(permiClientParams) {
        const { biconomyProvider, erc20ForwarderAddress, daiTokenAddress, networkId, } = permiClientParams;
        this.biconomyProvider = biconomyProvider;
        this.erc20ForwarderAddress = erc20ForwarderAddress;
        this.daiTokenAddress = daiTokenAddress;
        this.networkId = networkId;
        this.daiDomainData = {
            name: config_1.config.daiDomainName,
            version: config_1.config.daiVersion,
            chainId: this.networkId,
            verifyingContract: this.daiTokenAddress,
        };
    }
    /**
     * method to provide permission to spend dai tokens to a desired spender
     * @param {object} daiPermitOptions - dai permit options contains i) spender ii) expiry iii) user address iv) allowed
     * All of the above options are optional
     * If spender is not provided by default approval will be given to ERC20 Forwarder contract on the same network as your provider
     * When your provider does not have a signer you must pass user address
     */
    daiPermit(daiPermitOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const spender = daiPermitOptions.spender || this.erc20ForwarderAddress;
                const expiry = daiPermitOptions.expiry || Math.floor(Date.now() / 1000 + 3600);
                const allowed = daiPermitOptions.allowed || true;
                const { userAddress } = daiPermitOptions;
                const dai = new ethers_1.ethers.Contract(this.daiDomainData.verifyingContract, abis_1.daiAbi, this.biconomyProvider.getEthersProvider());
                const nonce = yield dai.nonces(userAddress);
                const permitDataToSign = {
                    types: {
                        EIP712Domain: config_1.config.domainType,
                        Permit: config_1.config.daiPermitType,
                    },
                    domain: this.daiDomainData,
                    primaryType: 'Permit',
                    message: {
                        holder: userAddress,
                        spender,
                        nonce: parseInt(nonce, 10),
                        expiry,
                        allowed: true,
                    },
                };
                const result = yield this.provider.send('eth_signTypedData_v4', [
                    userAddress,
                    JSON.stringify(permitDataToSign),
                ]);
                const signature = result.substring(2);
                const r = `0x${signature.substring(0, 64)}`;
                const s = `0x${signature.substring(64, 128)}`;
                const v = parseInt(signature.substring(128, 130), 16);
                const tx = yield dai.permit(userAddress, spender, parseInt(nonce, 10), expiry, allowed, v, r, s);
                return tx;
            }
            catch (error) {
                (0, utils_1.logMessage)(error);
                throw error;
            }
        });
    }
    /**
     * method to provide permission to spend tokens that support EIP2612 Permit
     * @param {object} permitOptions - permit options contain domainData, spender, value, deadline, userAddress
     * domainData and value are manadatory options (check https://biconomy.docs.io to see a working example of this)
     * If spender is not provided by default approval will be given to ERC20 Forwarder contract on the same network as your provider
     * When your provider does not have a signer you must pass user address
     */
    eip2612Permit(permitOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tokenDomainData = permitOptions.domainData;
                const tokenDomainType = permitOptions.domainType || config_1.config.domainType;
                const spender = permitOptions.spender || this.erc20ForwarderAddress;
                const { value } = permitOptions;
                const deadline = permitOptions.deadline || Math.floor(Date.now() / 1000 + 3600);
                const { userAddress } = permitOptions;
                const token = new ethers_1.ethers.Contract(tokenDomainData.verifyingContract, abis_1.erc20Eip2612Abi, this.biconomyProvider.getEthersProvider());
                const nonce = yield token.nonces(userAddress);
                const permitDataToSign = {
                    types: {
                        EIP712Domain: tokenDomainType,
                        Permit: config_1.config.eip2612PermitType,
                    },
                    domain: tokenDomainData,
                    primaryType: 'Permit',
                    message: {
                        owner: userAddress,
                        spender,
                        nonce,
                        value,
                        deadline,
                    },
                };
                const result = yield this.provider.send('eth_signTypedData_v4', [
                    userAddress,
                    JSON.stringify(permitDataToSign),
                ]);
                const signature = result.substring(2);
                const r = `0x${signature.substring(0, 64)}`;
                const s = `0x${signature.substring(64, 128)}`;
                const v = parseInt(signature.substring(128, 130), 16);
                const tx = yield token.permit(userAddress, spender, value, deadline, v, r, s);
                return tx;
            }
            catch (error) {
                (0, utils_1.logMessage)(error);
                throw error;
            }
        });
    }
}
exports.PermitClient = PermitClient;
//# sourceMappingURL=PermitClient.js.map
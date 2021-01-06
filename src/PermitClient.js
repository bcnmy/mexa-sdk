import {daiAbi, erc20Eip2612Abi} from "./abis";
import {ethers} from "ethers";
const {config} = require("./config");

let daiDomainData = {
    name: config.daiDomainName,
    version: config.daiVersion
};

let daiTokenAddressMap = {}, feeProxyAddressMap = {};

//Kovan
daiTokenAddressMap[42] = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";
//feeProxyAddressMap[42] = "0x966445784b8dd7a925794D35e335B2dd80C458A7";

//Rinkeby
daiTokenAddressMap[4] = "0xc7ad46e0b8a400bb3c915120d284aafba8fc4735";

/**
 * Single method to be used for logging purpose.
 *
 * @param {string} message Message to be logged
 */
function _logMessage(message) {
    if (config && config.logsEnabled && console.log) {
        console.log(message);
    }
}

class PermitClient {
    constructor(provider, feeProxyAddress) {
        const ethersProvider = new ethers.providers.Web3Provider(provider);
        this.provider = ethersProvider;
        this.feeProxyAddress = feeProxyAddress;
        this.daiDomainData = daiDomainData;
    }

    async daiPermit(daiPermitOptions) {
        const spender = daiPermitOptions.spender || this.feeProxyAddress;
        const expiry = daiPermitOptions.expiry || Math.floor(Date.now() / 1000 + 3600);
        const allowed = daiPermitOptions.allowed || true;

        let network = await this.provider.getNetwork();
        daiDomainData.chainId = network.chainId;
        daiDomainData.verifyingContract = daiTokenAddressMap[network.chainId];
      //const defaultSpender = (this.feeProxyAddress != null) ? this.feeProxyAddress : feeProxyAddressMap[network.chainId]; 

        const dai = new ethers.Contract(this.daiDomainData.verifyingContract, daiAbi, this.provider.getSigner());
        const userAddress = await this.provider.getSigner().getAddress();
        const nonce = await dai.nonces(userAddress);
        const permitDataToSign = {
            types: {
                EIP712Domain: config.domainType,
                Permit: config.daiPermitType
            },
            domain: this.daiDomainData,
            primaryType: "Permit",
            message: {
                holder: userAddress,
                spender: spender,
                nonce: parseInt(nonce),
                expiry: parseInt(expiry),
                allowed: true
            }
        };
        const result = await this.provider.send("eth_signTypedData_v4", [userAddress, JSON.stringify(permitDataToSign),]);
        _logMessage("success", result);
        const signature = result.substring(2);
        const r = "0x" + signature.substring(0, 64);
        const s = "0x" + signature.substring(64, 128);
        const v = parseInt(signature.substring(128, 130), 16);
        await dai.permit(userAddress, spender, parseInt(nonce), parseInt(expiry.toString()), allowed, v, r, s);
    }

    //todo
    //should we give holder or owner option also
    async eip2612Permit(permitOptions) {
        const tokenDomainData = permitOptions.domainData;
        const spender = permitOptions.spender || this.feeProxyAddress;
        const value = permitOptions.value;
        const deadline = permitOptions.deadline || Math.floor(Date.now() / 1000 + 3600);
        const userAddress = await this.provider.getSigner().getAddress();
        const token = new ethers.Contract(tokenDomainData.verifyingContract, erc20Eip2612Abi, this.provider.getSigner());
        const nonce = await token.nonces(userAddress);
        const permitDataToSign = {
            types: {
                EIP712Domain: config.domainType,
                Permit: config.eip2612PermitType
            },
            domain: tokenDomainData,
            primaryType: "Permit",
            message: {
                owner: userAddress,
                spender: spender,
                nonce: parseInt(nonce),
                value: value,
                deadline: parseInt(deadline)
            }
        };
        const result = await this.provider.send("eth_signTypedData_v4", [userAddress, JSON.stringify(permitDataToSign),]);
        _logMessage("success", result);
        const signature = result.substring(2);
        const r = "0x" + signature.substring(0, 64);
        const s = "0x" + signature.substring(64, 128);
        const v = parseInt(signature.substring(128, 130), 16);
        await token.permit(userAddress, spender, value, parseInt(deadline.toString()), v, r, s);
    }
}

export default PermitClient;


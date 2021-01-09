import { daiAbi, erc20Eip2612Abi } from "./abis";
import { ethers } from "ethers";
const { config } = require("./config");

let daiDomainData = {
  name: config.daiDomainName,
  version: config.daiVersion,
};

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
/**
 * Class to provide methods to give token transfer permissions to Biconomy's ERC20Forwarder smart contract
 * ERC20Forwarder contract is responsible to calculate gas cost in ERC20 tokens and making a transfer on user's behalf
 * For DAI token there is a special permit method provided
 * For Tokens that support EIP2612 standard (like USDC) users should use eip2612Permit
 * Check https://docs.biconomy.io to see examples of how to use permit client to give one time token approvals
 */
class PermitClient {
  constructor(provider, feeProxyAddress, daiTokenAddress) {
    const ethersProvider = new ethers.providers.Web3Provider(provider);
    this.provider = ethersProvider;
    this.feeProxyAddress = feeProxyAddress;
    this.daiTokenAddress = daiTokenAddress;
    this.daiDomainData = daiDomainData;
  }

  /**
   * method to provide permission to spend dai tokens to a desired spender
   * @param {object} daiPermitOptions - dai permit options contains i) spender ii) expiry iii) user address iv) allowed
   * All of the above options are optional
   * If spender is not provided by default approval will be given to ERC20 Forwarder contract on the same network as your provider
   * When your provider does not have a signer you must pass user address
   */
  async daiPermit(daiPermitOptions) {
    try {
      const spender = daiPermitOptions.spender || this.feeProxyAddress;
      const expiry =
        daiPermitOptions.expiry || Math.floor(Date.now() / 1000 + 3600);
      const allowed = daiPermitOptions.allowed || true;
      const userAddress =
        daiPermitOptions.userAddress ||
        (await this.provider.getSigner().getAddress());

      let network = await this.provider.getNetwork();
      daiDomainData.chainId = network.chainId;
      daiDomainData.verifyingContract = this.daiTokenAddress;

      const dai = new ethers.Contract(
        this.daiDomainData.verifyingContract,
        daiAbi,
        this.provider.getSigner()
      );
      const nonce = await dai.nonces(userAddress);
      const permitDataToSign = {
        types: {
          EIP712Domain: config.domainType,
          Permit: config.daiPermitType,
        },
        domain: this.daiDomainData,
        primaryType: "Permit",
        message: {
          holder: userAddress,
          spender: spender,
          nonce: parseInt(nonce),
          expiry: parseInt(expiry),
          allowed: true,
        },
      };
      const result = await this.provider.send("eth_signTypedData_v4", [
        userAddress,
        JSON.stringify(permitDataToSign),
      ]);
      _logMessage("success", result);
      const signature = result.substring(2);
      const r = "0x" + signature.substring(0, 64);
      const s = "0x" + signature.substring(64, 128);
      const v = parseInt(signature.substring(128, 130), 16);
      await dai.permit(
        userAddress,
        spender,
        parseInt(nonce),
        parseInt(expiry.toString()),
        allowed,
        v,
        r,
        s
      );
    } catch (error) {
      _logMessage(error);
      throw error;
    }
  }

  /**
   * method to provide permission to spend tokens that support EIP2612 Permit
   * @param {object} permitOptions - permit options contain domainData, spender, value, deadline, userAddress
   * domainData and value are manadatory options (check https://biconomy.docs.io to see a working example of this)
   * If spender is not provided by default approval will be given to ERC20 Forwarder contract on the same network as your provider
   * When your provider does not have a signer you must pass user address
   */
  async eip2612Permit(permitOptions) {
    try {
      const tokenDomainData = permitOptions.domainData;
      const spender = permitOptions.spender || this.feeProxyAddress;
      const value = permitOptions.value;
      const deadline =
        permitOptions.deadline || Math.floor(Date.now() / 1000 + 3600);
      const userAddress =
        permitOptions.userAddress ||
        (await this.provider.getSigner().getAddress());
      const token = new ethers.Contract(
        tokenDomainData.verifyingContract,
        erc20Eip2612Abi,
        this.provider.getSigner()
      );
      const nonce = await token.nonces(userAddress);
      const permitDataToSign = {
        types: {
          EIP712Domain: config.domainType,
          Permit: config.eip2612PermitType,
        },
        domain: tokenDomainData,
        primaryType: "Permit",
        message: {
          owner: userAddress,
          spender: spender,
          nonce: parseInt(nonce),
          value: value,
          deadline: parseInt(deadline),
        },
      };
      const result = await this.provider.send("eth_signTypedData_v4", [
        userAddress,
        JSON.stringify(permitDataToSign),
      ]);
      _logMessage("success", result);
      const signature = result.substring(2);
      const r = "0x" + signature.substring(0, 64);
      const s = "0x" + signature.substring(64, 128);
      const v = parseInt(signature.substring(128, 130), 16);
      await token.permit(
        userAddress,
        spender,
        value,
        parseInt(deadline.toString()),
        v,
        r,
        s
      );
    } catch (error) {
      _logMessage(error);
      throw error;
    }
  }
}

export default PermitClient;

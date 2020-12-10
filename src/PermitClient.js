import {daiAbi,erc20Eip2612Abi} from './abis';
import {ethers} from 'ethers';
import Biconomy from './Biconomy';

const domainType = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const daiPermitType = [
  { name: "holder", type: "address" },
  { name: "spender", type: "address" },
  { name: "nonce", type: "uint256" },
  { name: "expiry", type: "uint256" },
  { name: "allowed", type: "bool" },
];

class PermitClient{

constructor(provider,biconomyOptions){
    const biconomy = new Biconomy(provider, biconomyOptions);
    const ethersProvider = new ethers.providers.Web3Provider(provider);
    this.provider = ethersProvider;
    this.signer = ethersProvider.getSigner();
}

// pending final reviews
async daiPermit(tokenDomainData,nonce,spender,expiry,allowed){
    const dai = new ethers.Contract(tokenDomainData.verifyingContract,daiAbi,this.signer);
    const userAddress = await (this.signer).getAddress();
    //const nonce = await this.token.nonces(userAddress);
    const permitDataToSign = {
      types: {
            EIP712Domain: domainType,
            Permit: daiPermitType
        },
        domain: tokenDomainData,
        primaryType: "Permit",
        message: {
            holder : userAddress,
            spender : spender,
            nonce: parseInt(nonce),
            expiry: parseInt(expiry),
            allowed: true
        }
      };
    const result = await this.provider.send("eth_signTypedData_v4",[userAddress,JSON.stringify(permitDataToSign)]);
    console.log("success",result);
    const signature = result.substring(2);
    const r = "0x" + signature.substring(0, 64);
    const s = "0x" + signature.substring(64, 128);
    const v = parseInt(signature.substring(128, 130), 16);
    await dai.permit(userAddress,spender,parseInt(nonce),parseInt(expiry.toString()),allowed,v,r,s);
  }

  async eip2612Permit(tokenDomainData,spender,value,deadline){
    const userAddress = await (this.signer).getAddress();
    const token = new ethers.Contract(tokenDomainData.verifyingContract,erc20Eip2612Abi,this.signer);
    const nonce = await this.token.nonces(userAddress);
    const permitDataToSign = {
        types: {
            EIP712Domain: domainType,
            Permit: permitType
        },
        domain: tokenDomainData,
        primaryType: "Permit",
        message: {
            holder : userAddress,
            spender : spender,
            nonce: parseInt(nonce),
            value: value,
            deadline: deadline
        }
      };
    const result = await this.provider.send("eth_signTypedData_v4",[userAddress,JSON.stringify(permitDataToSign)]);
    console.log("success",result);
    const signature = result.substring(2);
    const r = "0x" + signature.substring(0, 64);
    const s = "0x" + signature.substring(64, 128);
    const v = parseInt(signature.substring(128, 130), 16);
    await token.permit(this.signerAddress,spender,value,parseInt(deadline.toString()),v,r,s);
  }

}

export default PermitClient;
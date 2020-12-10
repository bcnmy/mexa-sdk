import {daiAbi,erc20Eip2612Abi} from './abis';
import {ethers} from 'ethers';
import Biconomy from './Biconomy';


class PermitClient{

constructor(provider,biconomyOptions){
    const biconomy = new Biconomy(provider, biconomyOptions);
    const ethersProvider = new ethers.providers.Web3Provider(biconomy);
    this.signer = ethersProvider.getSigner();
}


async daiPermit(tokenDomainData,spender,expiry,allowed){
    const dai = new ethers.contract(tokenDomainData.verifyingContract,daiAbi,this.signer);
    const userAddress = await (this.signer).getAddress();
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
            nonce: nonce.toString(),
            expiry: expiry,
            allowed: allowed
        }
      };
    const result = await this.signer.send("eth_signTypedData_v4",[userAddress,JSON.stringify(permitDataToSign)]);
    console.log("success",result);
    const signature = result.substring(2);
    const r = "0x" + signature.substring(0, 64);
    const s = "0x" + signature.substring(64, 128);
    const v = parseInt(signature.substring(128, 130), 16);
    await dai.permit(this.signerAddress,spender,nonce,expiry,allowed,v,r,s);
  }

  async eip2612Permit(tokenDomainData,spender,value,deadline){
    const token = new ethers.contract(tokenDomainData.verifyingContract,erc20Eip2612Abi,this.signer);
    const nonce = await this.token.nonces(userAddress);
    const permitDataToSign = {
        types: {
            EIP712Domain: domainType,
            Permit: permitType
        },
        domain: tokenDomainData,
        primaryType: "Permit",
        message: {
            holder : this.signerAddress,
            spender : spender,
            nonce: nonce.toString(),
            value: value,
            deadline: deadline
        }
      };
    const result = await this.signer.send("eth_signTypedData_v4",[userAddress,JSON.stringify(permitDataToSign)]);
    console.log("success",result);
    const signature = result.substring(2);
    const r = "0x" + signature.substring(0, 64);
    const s = "0x" + signature.substring(64, 128);
    const v = parseInt(signature.substring(128, 130), 16);
    await token.permit(this.signerAddress,spender,value,deadline,v,r,s);
  }

}

export default PermitClient;
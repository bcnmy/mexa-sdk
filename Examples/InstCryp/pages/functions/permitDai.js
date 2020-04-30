// import Interface from "./interface.json";
import { getERCContractInstance } from './contractinstance'

const domainSchema = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" }
];

const permitSchema = [
  { name: "holder", type: "address" },
  { name: "spender", type: "address" },
  { name: "nonce", type: "uint256" },
  { name: "expiry", type: "uint256" },
  { name: "allowed", type: "bool" }
];

export default async (web3, signer, CONTRACT_ADDRESS) => {
  // const web3 = new Web3(window.web3.currentProvider);
  const domainData = {
    name: "Dai Stablecoin",
    version: "1",
    chainId: 42,
    verifyingContract: "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa" // kovan
    // verifyingContract: "0xaD6D458402F60fD3Bd25163575031ACDce07538D" //ropsten
  };

//   const daiInstance = new web3.eth.Contract(
//     Interface.abi,
//     "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa"
//   );

  console.log(web3)
  const daiInstance = getERCContractInstance(web3, "DAI");


  let nonce = await daiInstance.methods.nonces(signer).call();
  const message = {
    holder: signer,
    spender: CONTRACT_ADDRESS,
    nonce: nonce,
    expiry: 0,
    allowed: true
  };

  let typedData = JSON.stringify({
    types: {
      EIP712Domain: domainSchema,
      Permit: permitSchema
    },
    primaryType: "Permit",
    domain: domainData,
    message
  });
  web3.currentProvider.sendAsync(
    {
      method: "eth_signTypedData_v3",
      params: [signer, typedData],
      from: signer
    },
    async function(err, result) {
      if (err) return console.error(err);
      console.log("PERSONAL SIGNED:" + JSON.stringify(result.result));
      const signature = result.result.substring(2);
      const r = "0x" + signature.substring(0, 64);
      const s = "0x" + signature.substring(64, 128);
      const v = parseInt(signature.substring(128, 130), 16);
      // The signature is now comprised of r, s, and v.
      console.log("signature: ", signature);
      await daiInstance.methods
        .permit(signer, CONTRACT_ADDRESS, nonce, 0, true, v, r, s)
        .send({ from: signer, gas: 4000000 });
      console.log("Permitted..")
    }
  );
};
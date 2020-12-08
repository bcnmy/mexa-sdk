import {ethers} from 'ethers';
import { forwarderAbi } from "./abis";
const {
    config
  } = require("./config");
  

const buildForwardTxRequest = async (
  account,
  to,
  gasLimitNum,
  data,
  newBatch = false
) => {
  const batchId = newBatch
    ? await biconomyForwarder.methods.getBatch(userAddress).call()
    : 0;
  const batchNonce = await biconomyForwarder.methods
    .getNonce(account, batchId)
    .call();
  const req = {
    from: account,
    to: to,
    token: ZERO_ADDRESS,
    txGas: gasLimitNum,
    tokenGasPrice: "0",
    batchId: batchId,
    batchNonce: parseInt(batchNonce),
    deadline: Math.floor(Date.now() / 1000 + 3600),
    data: data,
  };
  return { request: req };
};

const getDomainSeperator = () => {
  const domainSeparator = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        ethers.utils.id(
          "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        ),
        ethers.utils.id(biconomyForwarderDomainData.name),
        ethers.utils.id(biconomyForwarderDomainData.version),
        biconomyForwarderDomainData.chainId,
        biconomyForwarderDomainData.verifyingContract,
      ]
    )
  );
  return domainSeparator;
};



module.exports = { buildForwardTxRequest, getDomainSeperator };
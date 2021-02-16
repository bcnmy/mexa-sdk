let { ethers } = require("ethers");
const {config} = require("./config");
const ZERO_ADDRESS = config.ZERO_ADDRESS;

const buildForwardTxRequest = async (account, to, gasLimitNum, data, biconomyForwarder, newBatch = false) => {
    const batchId = newBatch ? await biconomyForwarder.getBatch(userAddress) : 0;
    const batchNonce = await biconomyForwarder.getNonce(account, batchId);
    const req = {
        from: account,
        to: to,
        token: ZERO_ADDRESS,
        txGas: gasLimitNum,
        tokenGasPrice: "0",
        batchId: batchId,
        batchNonce: parseInt(batchNonce),
        deadline: Math.floor(Date.now() / 1000 + 3600),
        data: data
    };
    return {request: req};
};

const getDomainSeperator = (biconomyForwarderDomainData) => {
    const domainSeparator = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode([
        "bytes32",
        "bytes32",
        "bytes32",
        "uint256",
        "address"
    ], [
        ethers.utils.id("EIP712Domain(string name,string version,uint256 salt,address verifyingContract)"),
        ethers.utils.id(biconomyForwarderDomainData.name),
        ethers.utils.id(biconomyForwarderDomainData.version),
        biconomyForwarderDomainData.salt,
        biconomyForwarderDomainData.verifyingContract,
    ]));
    return domainSeparator;
};


module.exports = {
    buildForwardTxRequest,
    getDomainSeperator
};

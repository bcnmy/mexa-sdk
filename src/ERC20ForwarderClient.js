import {ethers} from "ethers";
const {config, RESPONSE_CODES} = require("./config");
const abiDecoder = require("abi-decoder");

const erc20ForwardRequestType = config.erc20ForwardRequestType;
const domainType = config.domainType;

function formatMessage(code, message) {
    return {code: code, message: message};
}

// pass the networkId to get gas price
const getGasPrice = async (networkId) => {
    const apiInfo = `${
        config.baseURL
    }/api/v1/gas-price?networkId=${networkId}`;
    const response = await fetch(apiInfo);
    const responseJson = await response.json();
    console.log("Response JSON " + JSON.stringify(responseJson));
    return ethers.utils.parseUnits(responseJson.gasPrice.value.toString(), "gwei").toString();
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

class ERC20ForwarderClient {
    constructor(forwarderClientOptions, signer, networkId, provider, feeProxyDomainData, feeProxy, transferHandler, forwarder, oracleAggregator, feeManager) {
        this.biconomyAttributes = forwarderClientOptions;
        this.signer = signer;
        this.networkId = networkId;
        this.provider = provider;
        this.feeProxyDomainData = feeProxyDomainData;
        this.biconomyForwarderDomainData = biconomyForwarderDomainData;
        this.feeProxy = feeProxy;
        this.oracleAggregator = oracleAggregator;
        this.feeManager = feeManager;
        this.forwarder = forwarder;
        this.transferHandler = transferHandler;
    }

    getApiId(req) {
        const method = this.biconomy.decoderMap[req.to.toLowerCase()].decodeMethod(req.data);
        return this.biconomy.dappAPIMap[req.to.toLowerCase()][method.name.toString()];
    }

    async getTokenGasPrice(tokenAddress) {
        const gasPrice = ethers.BigNumber.from(await getGasPrice(this.networkId));
        const tokenPrice = await this.oracleAggregator.getTokenPrice(tokenAddress);
        const tokenOracleDecimals = await this.oracleAggregator.getTokenOracleDecimals(tokenAddress);
        return gasPrice.mul(ethers.BigNumber.from(10).pow(tokenOracleDecimals)).div(tokenPrice).toString();
    }

    async buildTx(to, token, txGas, data, newBatch = false) {
        const userAddress = await this.signer.getAddress();
        const batchId = newBatch ? await this.forwarder.getBatch(userAddress) : 0;
        let nonce = await this.forwarder.getNonce(userAddress, batchId);
        const batchNonce = Number(nonce);
        const tokenGasPrice = await this.getTokenGasPrice(token);

        const req = {
            from: userAddress,
            to: to,
            token: token,
            txGas: txGas,
            tokenGasPrice: tokenGasPrice,
            batchId: batchId,
            batchNonce: batchNonce,
            deadline: Math.floor(Date.now() / 1000 + 3600),
            data: data
        };

        const feeMultiplier = await this.feeManager.getFeeMultiplier(userAddress, token);
        const tokenOracleDecimals = await this.oracleAggregator.getTokenOracleDecimals(tokenAddress);
        const transferHandlerGas = await this.feeProxy.transferHandlerGas();
        // todo
        // verify cost calculation
        let cost = ethers.BigNumber.from(req.txGas.toString()).add(transferHandlerGas).mul(ethers.BigNumber.from(req.tokenGasPrice)).mul(ethers.BigNumber.from(feeMultiplier.toString)).div(ethers.BigNumber.from(10000)).div(ethers.BigNumber.from(10).pow(ethers.BigNumber.from(tokenOracleDecimals)));
        let fee = parseFloat(cost.toString()); // exact amount in tokens

        return {request: req, cost: fee};
    }

    async buildTransferTx(token, to, amount) { // should have call to check if user approved transferHandler

        const txCall = await this.transferHandler.populateTransaction.transfer(token, to, amount);
        return await this.buildTx(this.transferHandler.address, token, 100000, txCall.data);
    }

    // todo
    // test after error handler changes
    async sendTxEIP712(req) { // should have call to check if user approved transferHandler
        const domainSeparator = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode([
            "bytes32",
            "bytes32",
            "bytes32",
            "uint256",
            "address"
        ], [
            ethers.utils.id("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            ethers.utils.id(this.feeProxyDomainData.name),
            ethers.utils.id(this.feeProxyDomainData.version),
            this.feeProxyDomainData.chainId,
            this.feeProxyDomainData.verifyingContract,
        ]));
        const userAddress = await this.signer.getAddress();
        const erc20fr = Object.assign({}, req);
        erc20fr.dataHash = ethers.utils.keccak256(erc20fr.data);
        delete erc20fr.data;
        const dataToSign = {
            types: {
                EIP712Domain: domainType,
                ERC20ForwardRequest: erc20ForwardRequestType
            },
            domain: this.feeProxyDomainData,
            primaryType: "ERC20ForwardRequest",
            message: erc20fr
        };

        const sig = await this.provider.send("eth_signTypedData_v4", [req.from, JSON.stringify(dataToSign),]);
        const api = this.getApiId(req);
        const apiId = api.id;
        /**
     * check if api is present 
     * if not present send normal transaction based on method,to,req.data 
     * instead of meta transaction call to the server api 
     * possibly include biconomy's event emitter to throw error
     */
        const metaTxBody = {
            to: req.to,
            from: userAddress,
            apiId: apiId,
            params: [
                req, domainSeparator, sig
            ],
            signatureType: "EIP712Sign"
        };
        fetch(`${
            config.baseURL
        }/api/v2/meta-tx/native`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.biconomy.apiKey
            },
            body: JSON.stringify(metaTxBody)
        }).then(function (txResponse) {
            const responseJson = txResponse.json();
            return responseJson["txHash"];
        }).catch(function (error) { // could use event emitter from biconomy
            _logMessage(error.toString());
            return formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Meta transaction API call failed at the server");
        });
        const responseJson = await biconomy.json();
        return responseJson["txHash"];
    }

    async sendTxPersonalSign(req) {
        const hashToSign = abi.soliditySHA3([
            "address",
            "address",
            "address",
            "uint256",
            "uint256",
            "uint256",
            "uint256",
            "uint256",
            "bytes32",
        ], [
            req.from,
            req.to,
            req.token,
            req.txGas,
            req.tokenGasPrice,
            req.batchId,
            req.batchNonce,
            req.deadline,
            ethers.utils.keccak256(req.data),
        ]);
        const userAddress = await this.signer.getAddress();
        const sig = this.provider.signMessage(hashToSign); // verify
        const api = this.getApiId(req);
        const apiId = api.id;
        const metaTxBody = {
            to: req.to,
            from: userAddress,
            apiId: apiId,
            params: [req, sig]
        };
        fetch(`${
            config.baseURL
        }/api/v2/meta-tx/native`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.biconomy.apiKey
            },
            body: JSON.stringify(metaTxBody)
        }).then(function (txResponse) {
            const responseJson = txResponse.json();
            return responseJson["txHash"];
        }).catch(function (error) {
            // todo
            // use event emitter from biconomy
            _logMessage(error.toString());
            return formatMessage(RESPONSE_CODES.ERROR_RESPONSE, "Meta transaction API call failed at the server");
        });
    }

    async getSignatureEIP712(account, request) {
        const erc20fr = Object.assign({}, request);
        erc20fr.dataHash = ethers.utils.keccak256(erc20fr.data);
        delete erc20fr.data;
        const dataToSign = JSON.stringify({
            types: {
                EIP712Domain: domainType,
                ERC20ForwardRequest: erc20ForwardRequestType
            },
            domain: this.biconomyForwarderDomainData,
            primaryType: "ERC20ForwardRequest",
            message: erc20fr
        });

        const promi = new Promise(async function (resolve, reject) {
            await getWeb3(engine).currentProvider.send({
                jsonrpc: "2.0",
                id: 999999999999,
                method: "eth_signTypedData_v4",
                params: [account, dataToSign]
            }, function (error, res) {
                if (error) {
                    reject(error);
                } else {
                    resolve(res.result);
                }
            });
        });

        return promi;
    }

    async getSignaturePersonal(account, req) {
        const hashToSign = abi.soliditySHA3([
            "address",
            "address",
            "address",
            "uint256",
            "uint256",
            "uint256",
            "uint256",
            "uint256",
            "bytes32",
        ], [
            req.from,
            req.to,
            req.token,
            req.txGas,
            req.tokenGasPrice,
            req.batchId,
            req.batchNonce,
            req.deadline,
            ethers.utils.keccak256(req.data),
        ]);

        const signature = await getWeb3(engine).eth.personal.sign("0x" + hashToSign.toString("hex"), account);

        return signature;
    }

}

export default ERC20ForwarderClient;


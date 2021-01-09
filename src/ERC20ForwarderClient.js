import {ethers} from "ethers";
const {config} = require("./config");
const abi = require("ethereumjs-abi");

const erc20ForwardRequestType = config.forwardRequestType;
const domainType = config.domainType;
const FORWARD_OVERHEAD_EIP712_SIGN = config.overHeadEIP712Sign;

/**
 * Method to get the gas price for a given network that'll be used to
 * send the transaction by Biconomy Relayer Network.
 *
 * @param {number} networkId Network id for which gas price is needed
 */
const getGasPrice = async (networkId) => {
    const gasPriceURL = `${
        config.baseURL
    }/api/v1/gas-price?networkId=${networkId}`;
    try {
        const response = await fetch(gasPriceURL);
        if(response && response.json) {
            const responseJson = await response.json();
            _logMessage("Gas Price Response JSON " + JSON.stringify(responseJson));
            if(responseJson && responseJson.gasPrice && responseJson.gasPrice.value) {
                return ethers.utils.parseUnits(responseJson.gasPrice.value.toString(), "gwei").toString();
            }
        }
        throw new Error(`Error getting gas price from url ${gasPriceURL}`)
    } catch(error) {
        _logMessage(error);
        throw error;
    }
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
 * Class to provide methods to interact with Biconomy's ERC20Forwarder smart contract
 * to send meta transactions and let end users pay the gas fee in ERC20 tokens.
 * Check https://docs.biconomy.io to see list of supported tokens and guides on how to use this.
 *
 * This class supports both EIP712 and personal signatures.
 */
class ERC20ForwarderClient {
    constructor({forwarderClientOptions, networkId, provider, feeProxyDomainData,
        biconomyForwarderDomainData, feeProxy, transferHandler, forwarder, oracleAggregator,
        feeManager, isSignerWithAccounts}) {
        this.biconomyAttributes = forwarderClientOptions;
        this.networkId = networkId;
        this.provider = provider;
        this.feeProxyDomainData = feeProxyDomainData;
        this.biconomyForwarderDomainData = biconomyForwarderDomainData;
        this.feeProxy = feeProxy;
        this.oracleAggregator = oracleAggregator;
        this.feeManager = feeManager;
        this.forwarder = forwarder;
        this.transferHandler = transferHandler;
        this.isSignerWithAccounts = isSignerWithAccounts;
    }

    /**
     * Check if given token address is supported by Biconomy or not.
     *
     * @param {address} token Token address to check
     */
    async checkTokenSupport(token) {
        if(!ethers.utils.isAddress(token)) throw new Error(`"token" address ${token} is not a valid ethereum address`);
        if(!this.feeManager) throw new Error("Biconomy Fee Manager contract is not initialized properly.");

        const isTokenSupported = await this.feeManager.getTokenAllowed(token);
        if(!isTokenSupported)
            throw new Error(`Token with address ${token} is not supported. Please refer https://docs.biconomy.io to see list of supported tokens`);
    }

    /**
     * Method returns the apiId corresponding to the method being called as
     * given in the request object. The same apiId you can find on Biconomy
     * Dashboard under Manage API section.
     *
     * @param {object} req Request object containing required fields
     */
    getApiId(req) {
        try {
            if(!this.biconomyAttributes)
                throw new Error("Biconomy is not initialized properly. 'biconomyAttributes'  is missing in ERC20ForwarderClient");
            if(!this.biconomyAttributes.decoderMap)
                throw new Error("Biconomy is not initialized properly. 'decoderMap' is missing in ERC20ForwarderClient.biconomyAttributes");

            if(!req || !req.to || !req.data) {
                throw new Error("'to' and 'data' field is mandatory in the request object parameter");
            }

            let decoder = this.biconomyAttributes.decoderMap[req.to.toLowerCase()];
            if(decoder) {
                const method = decoder.decodeMethod(req.data);
                const contractData = this.biconomyAttributes.dappAPIMap[req.to.toLowerCase()];
                if(method && method.name) {
                    if(contractData) {
                        return this.biconomyAttributes.dappAPIMap[req.to.toLowerCase()][method.name.toString()];
                    } else {
                        throw new Error(`Method ${method.name} is not registerd on Biconomy Dashboard. Please refer https://docs.biconomy.io to see how to register smart contract methods on dashboard.`)
                    }
                } else {
                    throw new Error(`Unable to decode the method. The method you are calling might not be registered on Biconomy dashboard. Please check.`)
                }
            } else {
                throw new Error(`Your smart contract with address ${req.to} might not be registered on Biconomy dashboard. Please check.`)
            }
        } catch(error) {
            _logMessage(error);
            throw error;
        }
    }

    /**
     * Method returns the gas price in the given ERC20 token based on
     * current gas price of the blockchain. It refers to a oracleAgggregator
     * smart contract that fetches the token price from onchain price oracles like
     * ChainLink, Uniswap etc.
     *
     * @param {string} tokenAddress Token Address
     */
    async getTokenGasPrice(tokenAddress) {
        try {
            if(!ethers.utils.isAddress(tokenAddress))
                throw new Error(`Invalid token address: ${tokenAddress} Please passs a valid ethereum address`);
            if(!this.oracleAggregator)
                throw new Error("Oracle Aggregator contract is not initialized properly");

            const gasPrice = ethers.BigNumber.from(await getGasPrice(this.networkId));
            if(gasPrice == undefined || gasPrice == 0) {
                throw new Error(`Invalid gasPrice value ${gasPrice}. Unable to fetch gas price.`);
            }
            const tokenPrice = await this.oracleAggregator.getTokenPrice(tokenAddress);
            const tokenOracleDecimals = await this.oracleAggregator.getTokenOracleDecimals(tokenAddress);

            if(!tokenPrice || !tokenOracleDecimals)
                throw new Error(`Invalid tokenPrice ${tokenPrice} or tokenOracleDecimals ${tokenOracleDecimals} from oracle aggregator contract`)
            return gasPrice.mul(ethers.BigNumber.from(10).pow(tokenOracleDecimals)).div(tokenPrice).toString();
        } catch(error) {
            _logMessage(error);
            throw error;
        }
    }

    /**
     * Method builds a request object based on the input parameters.
     * Method fetches the user nonce from Biconomy Forwarder contract.
     * If you want to perform parallel transactions from same user account,
     * use different batchIds.
     *
     * @param {string} account User account address
     * @param {string} to Target Smart contract address
     * @param {number|string} txGas Estimated transaction gas for target method
     * @param {string} data Encoded target method data to be called
     * @param {string} token Token address in which gas payment is to be made
     * @param {number} batchId Batch id used to determine user nonce on Biconomy Forwarder contract
     * @param {number} deadlineInSec Deadline in seconds after which transaction will fail
     */
    async buildERC20TxRequest(account, to, txGas, data, token, batchId = 0, deadlineInSec = 3600) {
        try {
            if(!this.forwarder) throw new Error("Biconomy Forwarder contract is not initialized properly.");
            if(!ethers.utils.isAddress(account)) throw new Error(`User address ${account} is not a valid ethereum address`);
            if(!ethers.utils.isAddress(to)) throw new Error(`"to" address ${to} is not a valid ethereum address`);
            if(!ethers.utils.isAddress(token)) throw new Error(`"token" address ${token} is not a valid ethereum address`);

            await this.checkTokenSupport(token);

            let nonce = await this.forwarder.getNonce(account, batchId);
            const batchNonce = Number(nonce);
            const tokenGasPrice = await this.getTokenGasPrice(token);

            const req = {
                from: account,
                to: to,
                token: token,
                txGas: txGas,
                tokenGasPrice: tokenGasPrice,
                batchId: batchId,
                batchNonce: batchNonce,
                deadline: Math.floor(Date.now() / 1000 + deadlineInSec),
                data: data
            };
            return req;
        } catch(error) {
            _logMessage(error);
            throw error;
        }
    }

    /**
     * Method builds a request object based on the input parameters.
     * Method fetches the user nonce from Biconomy Forwarder contract.
     * If you want to perform parallel transactions from same user account,
     * use different batchIds.
     *
     * It returns the request object to be signed by the user and also gas estimation
     * in the given token to be used to pay transaction gas fee from user's account.
     *
     * @param {string} to Target Smart contract address
     * @param {string} token Token address in which gas payment is to be made
     * @param {number|string} txGas Estimated transaction gas for target method
     * @param {string} data Encoded target method data to be called
     * @param {number} batchId Batch id used to determine user nonce on Biconomy Forwarder contract
     * @param {number} deadlineInSec Deadline in seconds after which transaction will fail
     */
    async buildTx(to, token, txGas, data, batchId = 0, deadlineInSec = 3600) {
        try {
            if(!this.forwarder) throw new Error("Biconomy Forwarder contract is not initialized properly.");
            if(!this.feeManager) throw new Error("Biconomy Fee Manager contract is not initialized properly.");
            if(!this.oracleAggregator) throw new Error("Biconomy Oracle Aggregator contract is not initialized properly.");
            if(!this.feeProxy) throw new Error("Biconomy Fee Proxy contract is not initialized properly.");

            if(!ethers.utils.isAddress(to)) throw new Error(`"to" address ${to} is not a valid ethereum address`);
            if(!ethers.utils.isAddress(token)) throw new Error(`"token" address ${token} is not a valid ethereum address`);

            if(!txGas) throw new Error("'txGas' parameter is mandatory");

            if(!this.isSignerWithAccounts)
                throw new Error("Provider object passed to Biconomy does not have user account information. Refer to docs or contact Biconomy team to know how to use ERC20ForwarderClient properly");

            await this.checkTokenSupport(token);

            const userAddress = await (this.provider.getSigner()).getAddress();
            let nonce = await this.forwarder.getNonce(userAddress, batchId);
            const tokenGasPrice = await this.getTokenGasPrice(token);

            const req = {
                from: userAddress,
                to: to,
                token: token,
                txGas: txGas,
                tokenGasPrice: tokenGasPrice,
                batchId: batchId,
                batchNonce: Number(nonce),
                deadline: Math.floor(Date.now() / 1000 + deadlineInSec),
                data: data
            };

            const feeMultiplier = await this.feeManager.getFeeMultiplier(userAddress, token);
            const tokenOracleDecimals = await this.oracleAggregator.getTokenOracleDecimals(token);
            const transferHandlerGas = await this.feeProxy.transferHandlerGas(token);
            _logMessage(`TransferHandler gas from ERC20FeeProxy contract is ${transferHandlerGas.toString()}`);

            if(feeMultiplier == undefined || tokenOracleDecimals == undefined || transferHandlerGas == undefined)
                throw new Error(`One of the values is undefined. feeMultiplier: ${feeMultiplier} tokenOracleDecimals: ${tokenOracleDecimals} transferHandlerGas: ${transferHandlerGas}`)

            let cost = ethers.BigNumber.from(req.txGas.toString())
            .add(ethers.BigNumber.from(FORWARD_OVERHEAD_EIP712_SIGN.toString())) // Estimate on the higher end
            .add(transferHandlerGas)
            .mul(ethers.BigNumber.from(req.tokenGasPrice))
            .mul(ethers.BigNumber.from(feeMultiplier.toString()))
            .div(ethers.BigNumber.from(10000));
            cost = (parseFloat(cost)/parseFloat(ethers.BigNumber.from(10).pow(tokenOracleDecimals))).toFixed(2);
            let fee = parseFloat(cost.toString()); // Exact amount in tokens
            _logMessage(`Estimated Transaction Fee in token address ${token} is ${fee}`)
            return {request: req, cost: fee};
        } catch(error) {
            _logMessage(error);
            throw error;
        }
    }

    async buildTransferTx(token, to, amount) {
        try {
            const txCall = await this.transferHandler.populateTransaction.transfer(token, to, amount);
            return await this.buildTx(this.transferHandler.address, token, 100000, txCall.data);
        } catch(error) {
            _logMessage(error);
            throw error;
        }
    }

    /**
     * Method gets the user signature in EIP712 format and send the transaction
     * via Biconomy meta transaction API .
     * Check buildTx() method to see how to build the req object.
     * Signature param and userAddress are optional if you have initialized biconomy
     * with a provider that has user account information.
     *
     * @param {object} req Request object to be signed and sent
     * @param {string} signature Signature string singed from user account
     * @param {string} userAddress User blockchain address
     */
    async sendTxEIP712({req, signature = null, userAddress}) {
        // TODO: Check if user has given the approval to ERC20Forwarder contract
        // TODO : If signature is not passed and user Address is passed it shouldnt assume sugnature as user address
        try {
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

            if(this.isSignerWithAccounts) {
                userAddress = await (this.provider.getSigner()).getAddress();
            }

            if(!userAddress) {
                throw new Error("Either pass userAddress param or pass a provider to Biconomy with user accounts information");
            }

            const dataToSign = {
                types: {
                    EIP712Domain: domainType,
                    ERC20ForwardRequest: erc20ForwardRequestType
                },
                domain: this.feeProxyDomainData,
                primaryType: "ERC20ForwardRequest",
                message: req
            };

            const sig = (signature == null) ? await this.provider.send("eth_signTypedData_v4", [req.from, JSON.stringify(dataToSign),]) : signature;
            const api = this.getApiId(req);
            if(!api || !api.id)
                throw new Error("Could not find the apiId for the given request. Contact Biconomy for resolution");

            const apiId = api.id;
            const metaTxBody = {
                to: req.to,
                from: userAddress,
                gasLimit: 500000,
                apiId: apiId,
                params: [
                    req, domainSeparator, sig
                ],
                signatureType: this.biconomyAttributes.signType.EIP712_SIGN,
            };

            const txResponse = await fetch(`${
                config.baseURL
            }/api/v2/meta-tx/native`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.biconomyAttributes.apiKey
                },
                body: JSON.stringify(metaTxBody)
            });

            return await txResponse.json();
        } catch(error) {
            _logMessage(error);
            throw error;
        }
    }

    /**
     * Method gets the user signature in personal_sign format and send the transaction
     * via Biconomy meta transaction API .
     * Check buildTx() method to see how to build the req object.
     * Signature param and userAddress are optional if you have initialized biconomy
     * with a provider that has user account information.
     *
     * @param {object} req Request object to be signed and sent
     * @param {string} signature Signature string singed from user account
     * @param {string} userAddress User blockchain address
     */
    async sendTxPersonalSign({req, signature = null, userAddress}) {
        try {
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
            const signer = this.provider.getSigner();
            if(this.isSignerWithAccounts) {
                userAddress = await signer.getAddress();
            }

            if(!userAddress) {
                throw new Error("Either pass userAddress param or pass a provider to Biconomy with user accounts information");
            }
            const sig = (signature == null && this.isSignerWithAccounts) ? await signer.signMessage(hashToSign) : signature;

            if(sig == null || sig == undefined)
                throw new Error("Either pass signature param or pass a provider to Biconomy with user accounts information");

            const api = this.getApiId(req);
            if(!api || !api.id)
                throw new Error("Could not find the apiId for the given request. Contact Biconomy for resolution");

            const apiId = api.id;
            const metaTxBody = {
                to: req.to,
                from: userAddress,
                apiId: apiId,
                params: [req, sig],
                signatureType: this.biconomyAttributes.signType.PERSONAL_SIGN
            };

            const txResponse = await fetch(`${
                config.baseURL
            }/api/v2/meta-tx/native`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.biconomyAttributes.apiKey
                },
                body: JSON.stringify(metaTxBody)
            });

            return await txResponse.json();
        } catch(error) {
            _logMessage(error);
            throw error;
        }
    }
}

export default ERC20ForwarderClient;
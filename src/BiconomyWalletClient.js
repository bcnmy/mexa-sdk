const ethers = require("ethers");
const {
    config,
} = require("./config");
const {
    baseWalletAbi,
    walletFactoryAbi,
    entryPointAbi
} = require('./abis');

function isEthersProvider(provider) {
    return ethers.providers.Provider.isProvider(provider);
}

function getSignatureParameters(signature) {
    if (!ethers.utils.isHexString(signature)) {
        throw new Error(
            'Given value "'.concat(signature, '" is not a valid hex string.')
        );
    }
    var r = signature.slice(0, 66);
    var s = "0x".concat(signature.slice(66, 130));
    var v = "0x".concat(signature.slice(130, 132));
    v = ethers.BigNumber.from(v).toNumber();
    if (![27, 28].includes(v)) v += 27;
    return {
        r: r,
        s: s,
        v: v
    };
}

/**
 * Class to provide methods for biconomy wallet deployment, signature building and sending the transaction
 */
class BiconomyWalletClient {
    constructor({
        biconomyProvider, // notice we passed engine (Biconomy) here
        provider,
        // Either we pass above both or target provider and use API calls to relay
        targetProvider,
        biconomyAttributes,
        isSignerWithAccounts,
        walletFactoryAddress,
        baseWalletAddress,
        entryPointAddress,
        handlerAddress,
        networkId
    }) {
        this.engine = biconomyProvider;
        // Marked for removal
        this.biconomyAttributes = biconomyAttributes;
        this.isSignerWithAccounts = isSignerWithAccounts;
        this.provider = provider;
        this.targetProvider = targetProvider;
        this.walletFactoryAddress = walletFactoryAddress;
        this.baseWalletAddress = baseWalletAddress;
        this.entryPointAddress = entryPointAddress;
        this.handlerAddress = handlerAddress;

        let providerOrSigner;
        if (this.isSignerWithAccounts) {
            providerOrSigner = this.provider.getSigner();
        }
        else {
            providerOrSigner = this.provider;
        }
        this.providerOrSigner = providerOrSigner;

        this.networkId = networkId;

        this.walletFactory = new ethers.Contract(this.walletFactoryAddress, walletFactoryAbi, this.providerOrSigner);
        this.baseWallet = new ethers.Contract(this.baseWalletAddress, baseWalletAbi, this.providerOrSigner);
        this.entryPoint = new ethers.Contract(this.entryPointAddress, entryPointAbi, this.providerOrSigner);
    }

    async checkIfWalletExists({eoa, index = 0}) {
        // Read calls would need providerOrSigner
        let walletAddress = await this.walletFactory.getAddressForCounterfactualWallet(eoa, index);
        const doesWalletExist = await this.walletFactory.isWalletExist(walletAddress);
        if (doesWalletExist) {
            return {
                doesWalletExist,
                walletAddress
            }
        }
        return {
            doesWalletExist,
            walletAddress: null
        }
    }

    async checkIfWalletExistsAndDeploy({ eoa, index = 0, webHookAttributes }) {
        let walletAddress = await this.walletFactory.getAddressForCounterfactualWallet(eoa, index);
        const doesWalletExist = await this.walletFactory.isWalletExist[walletAddress];
        this.walletFactory = this.walletFactory.connect(this.engine.getSignerByAddress(eoa));
        if (!doesWalletExist) {
            let executionData = await this.walletFactory.populateTransaction.deployCounterFactualWallet(eoa, this.entryPointAddress, this.handlerAddress, index);
            let dispatchProvider = this.engine.getEthersProvider();

            let txParams = {
                data: executionData.data,
                to: this.walletFactory.address,
                from: eoa,
                webHookAttributes: webHookAttributes
            };

            let tx;
            try {
                tx = await dispatchProvider.send("eth_sendTransaction", [txParams])
            }
            catch (err) {
                // handle conditional rejections in this stack trace
                console.log(err);
                throw err;
            }
        }
        return walletAddress;
    }

    // Gasless transaction
    // gasPrice and baseGas will always be zero
    // we would add separate ERC20 (Forward) payment handlers in sdk
    async buildExecTransaction({ data, to, walletAddress, batchId = 0 }) {

        this.baseWallet = this.baseWallet.attach(walletAddress);

        const nonce = await this.baseWallet.getNonce(batchId);
        return {
            to,
            value: 0,
            data,
            operation: 0,
            safeTxGas: 0,
            baseGas: 0,
            gasPrice: 0,
            gasToken: config.ZERO_ADDRESS,
            refundReceiver: config.ZERO_ADDRESS,
            nonce
        }
    }

    async sendBiconomyWalletTransaction({ execTransactionBody, walletAddress, signatureType, signature = null, webHookAttributes }) {
        // let signature;

        if (!this.isSignerWithAccounts) {
            if (!signature) {
                throw new Error(
                    "Either pass signature param or pass a provider to Biconomy with user accounts information"
                );
            }
        }

        if (!signature) {
            if (signatureType === 'PERSONAL_SIGN') {
                const transactionHash = await this.baseWallet.getTransactionHash(
                    execTransactionBody.to,
                    execTransactionBody.value,
                    execTransactionBody.data,
                    execTransactionBody.operation,
                    execTransactionBody.safeTxGas,
                    execTransactionBody.baseGas,
                    execTransactionBody.gasPrice,
                    execTransactionBody.gasToken,
                    execTransactionBody.refundReceiver,
                    execTransactionBody.nonce
                );
                // Review targetProvider vs provider
                signature = await this.provider.getSigner().signMessage(ethers.utils.arrayify(transactionHash));
                let { r, s, v } = getSignatureParameters(signature);
                v += 4;
                v = ethers.BigNumber.from(v).toHexString();
                signature = r + s.slice(2) + v.slice(2);
            } else {
                signature = await this.provider.getSigner()._signTypedData(
                    { verifyingContract: walletAddress, chainId: this.networkId },
                    config.EIP712_SAFE_TX_TYPE,
                    execTransactionBody
                )
            }
        }

        this.baseWallet = this.baseWallet.attach(walletAddress);
        this.baseWallet = this.baseWallet.connect(this.engine.getSignerByAddress(walletAddress));
        
        let executionData = await this.baseWallet.populateTransaction.execTransaction(
            execTransactionBody.to,
            execTransactionBody.value,
            execTransactionBody.data,
            execTransactionBody.operation,
            execTransactionBody.safeTxGas,
            execTransactionBody.baseGas,
            execTransactionBody.gasPrice,
            execTransactionBody.gasToken,
            execTransactionBody.refundReceiver,
            signature
        );
        let dispatchProvider = this.engine.getEthersProvider();

        //TODO
        //Check if webhook attributes are passed before forwarding ?

        let txParams = {
             data: executionData.data,
             to: this.baseWallet.address,
             from: walletAddress,
             webHookAttributes: webHookAttributes
        };

        let tx;
        try {
            tx = await dispatchProvider.send("eth_sendTransaction", [txParams])
        }
        catch (err) {
            // handle conditional rejections in this stack trace
            console.log(err);
            throw err;
        }
        return tx;
    }

}

module.exports = BiconomyWalletClient;
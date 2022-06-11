const ethers = require("ethers");
const {
    config,
  } = require("./config");
const {
    baseWalletAbi,
    walletFactoryAbi,
    entryPointAbi
} = require('./abis');

/**
 * Class to provide methods for biconomy wallet deployment, signature building and sending the transaction
 */
class BiconomyWalletClient {
    constructor({
        ethersProvider,
        biconomyAttributes,
        walletFactoryAddress,
        baseWalletAddress,
        entryPointAddress,
        networkId
    }) {
        this.biconomyAttributes = biconomyAttributes;
        this.ethersProvider = ethersProvider;
        this.walletFactoryAddress = walletFactoryAddress;
        this.baseWalletAddress = baseWalletAddress;
        this.entryPointAddress = entryPointAddress;
        this.signer = this.ethersProvider.getSigner();
        this.networkId = networkId;
        this.walletFactory = new ethers.Contract(this.walletFactoryAddress, walletFactoryAbi, ethersProvider);
        this.baseWallet = new ethers.Contract(this.baseWalletAddress, baseWalletAbi, ethersProvider);
        this.entryPoint = new ethers.Contract(this.entryPointAddress, entryPointAbi, ethersProvider);
    }

    async checkIfWalletExists(walletOwner, index) {
        let walletAddress = await this.walletFactory.getAddressForCounterfactualWallet(walletOwner, index);
        const doesWalletExist = await this.walletFactory.isWalletExist[walletAddress];
        if(doesWalletExist) {
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

    async checkIfWalletExistsAndDeploy(walletOwner, index) {
        let walletAddress = await this.walletFactory.getAddressForCounterfactualWallet(walletOwner, index);
        const doesWalletExist = await this.walletFactory.isWalletExist[walletAddress];
        if(!doesWalletExist) {
            await this.walletFactory.deployCounterFactualWallet(walletOwner, this.entryPointAddress, index);
        }
        return walletAddress;
    }

    async buildExecTransaction(data, to, batchId) {
        const nonce = this.walletFactory.getNonce(batchId);
        return {
            to,
            value: 0,
            data,
            operation: 0,
            safeTxGas: 0,
            baseGas: 66909,
            gasPrice: 0,
            gasToken: config.ZERO_ADDRESS,
            refundReceiver: config.ZERO_ADDRESS,
            nonce
        }
    }

    async sendBiconomyWalletTransaction(execTransactionBody, walletOwner, walletAddress, signatureType) {

        let signature;
        if(signatureType === 'PERSONAL_SIGN') {
            const transactionHash = await walletContract.getTransactionHash(
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
            signature = await this.signer.send("personal_sign", [walletOwner, transactionHash]);
        }

        signature = await this.signer._signTypedData(
            { verifyingContract: walletAddress, chainId: this.networkId },
            config.EIP712_SAFE_TX_TYPE,
            execTransactionBody
          )
        
        await this.walletFactory.execTransaction(
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

    }

}

module.exports = BiconomyWalletClient;
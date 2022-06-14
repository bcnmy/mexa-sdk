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

/**
 * Class to provide methods for biconomy wallet deployment, signature building and sending the transaction
 */
class BiconomyWalletClient {
    constructor({
        provider, // notice we passed engine (Biconomy) here
        biconomyAttributes,
        walletFactoryAddress,
        baseWalletAddress,
        entryPointAddress,
        handlerAddress,
        networkId
    }) {
        this.biconomyAttributes = biconomyAttributes;
        // this.ethersProvider = ethersProvider;
        this.walletFactoryAddress = walletFactoryAddress;
        this.baseWalletAddress = baseWalletAddress;
        this.entryPointAddress = entryPointAddress;
        this.handlerAddress = handlerAddress;

        if (isEthersProvider(provider)) {
            this.provider = provider;
          } else {
            this.provider = new ethers.providers.Web3Provider(provider);
        }
        // TODO
        // handle signers carefully 
        // depends on provider passed to biconomy has accounts information or not
        this.signer = this.provider.getSigner();
        this.networkId = networkId;
         // has to be signer connected
        this.walletFactory = new ethers.Contract(this.walletFactoryAddress, walletFactoryAbi, this.provider.getSigner());
        // has to be signer connected
        this.baseWallet = new ethers.Contract(this.baseWalletAddress, baseWalletAbi, this.provider.getSigner());
        this.entryPoint = new ethers.Contract(this.entryPointAddress, entryPointAbi, this.provider.getSigner());
    }

    async checkIfWalletExists(walletOwner, index) {
        debugger;
        let walletAddress = await this.walletFactory.getAddressForCounterfactualWallet(walletOwner, index);
        console.log('walletAddress', walletAddress)
        debugger;
        const doesWalletExist = await this.walletFactory.isWalletExist[walletAddress];
        console.log('doesWalletExist', doesWalletExist);
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
            await this.walletFactory.deployCounterFactualWallet(walletOwner, this.entryPointAddress, this.handlerAddress, index);
        }
        return walletAddress;
    }

    // Gasless transaction
    // gasPrice and baseGas will always be zero
    // we would add separate ERC20 (Forward) payment handlers in sdk
    async buildExecTransaction(data, to, walletAddress, batchId) {
        this.baseWallet = this.baseWallet.attach(walletAddress);

        const nonce = this.baseWallet.getNonce(batchId);
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

    // Todo : only take walletaddress fetched from login flow
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
            // Review and test
            signature = await this.signer.send("personal_sign", [walletOwner, transactionHash]);
        }

        signature = await this.signer._signTypedData(
            { verifyingContract: walletAddress, chainId: this.networkId },
            config.EIP712_SAFE_TX_TYPE,
            execTransactionBody
          )

        // TODO
        // neat way
        // also test if the signer changes sdk does not have to be reinitialised for every new wallet and owner
        this.baseWallet = this.baseWallet.attach(walletAddress);
        
        let tx = await this.baseWallet.execTransaction(
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
        return tx;

    }

}

module.exports = BiconomyWalletClient;
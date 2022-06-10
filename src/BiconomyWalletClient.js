const ethers = require("ethers");
const {
    config,
  } = require("./config");
const {
    baseWalletAbi,
    walletFactoryAbi,
    entryPointAbi
} = require('./abis');

// TODO
// have to take to, waletAddress, data
const EIP712_SAFE_TX_TYPE = {
    // "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
    SafeTx: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" },
    ],
  };

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

    async checkIfWalletExists(walletOwner) {
        // Check with new contract changes
        // functions have changed
        const doesWalletExist = await this.walletFactory.isWalletExist[walletOwner];
        if(doesWalletExist) {
            const walletAddress = await this.walletFactory.getAddressForCounterfactualWallet(walletOwner);
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

    async checkIfWalletExistsAndDeploy(walletOwner) {
        let isWalletDeployed = await this.walletFactory.isWalletExist[walletOwner];
        if(!isWalletDeployed) {
            return await this._deployWallet(walletOwner)
        }
        return await this.walletFactory.getAddressForCounterfactualWallet(walletOwner);
    }

    async _deployWallet(walletOwner) {
        // Deploy contract directly from ethers Provoder
        // Refer to line 95 dai permit
        const deployWalletMetaTxApiId = await this._getDeployWalletMetaTxApiId();
        const deployWalletRequest = await this._buildDeployWalletRequest(walletOwner);
        const metaTxDeployWalletBody = {
            from: walletOwner,
            apiId: deployWalletMetaTxApiId,
            params: [deployWalletRequest, signature],
            to: walletFactoryAddress,
            signatureType: this.biconomyAttributes.signType.PERSONAL_SIGN,
        };

        const txResponse = await fetch(
            `${config.baseURL}/api/v2/meta-tx/native`,
            {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                "x-api-key": this.biconomyAttributes.apiKey,
                },
                body: JSON.stringify(metaTxDeployWalletBody),
            }
        );
        return await txResponse.json();
    }

    async _buildDeployWalletRequest(walletOwner) {
        let { data } = await this.walletFactory.populateTransaction.deployCounterFactualWallet(walletOwner, this.entryPointAddress);
        const to = this.walletFactoryAddress;
        const from = walletOwner;
        const txGas = Number(2100000);
        return {
            to,
            from,
            txGas,
            data
        }
    }

    async _getDeployWalletMetaTxApiId() {
        const method = 'deployCounterFactualWallet';
        return this.biconomyAttributes.dappAPIMap[this.walletFactory.toLowerCase()][
            method.name.toString()
        ];
    }

    // build transaction
    // sign transaction
    // send transaction to backend
    // Take flag for signatureType. Default EIP 712 Sign
    async sendBiconomyWalletTransaction(data, signature, walletOwner, walletAddress) {
        // const biconomyWalletMetaTransactionBody = {
        //     to: '0xB32992b4110257a451Af3c2ED6AC78776DD8C26b',
        //     value: 0,
        //     data: data || "0x",
        //     operation: 0,
        //     safeTxGas: 2100000, // review
        //     baseGas: 66909, // review
        //     gasPrice: 0,
        //     gasToken: config.ZERO_ADDRESS,
        //     refundReceiver: config.ZERO_ADDRESS,
        //     nonce: 0,
        //   };

        // const { signature } = await this.safeSignTypedData(
        //     walletAddress,
        //     biconomyWalletMetaTransactionBody
        // );

        const req = {
            to: '0xB32992b4110257a451Af3c2ED6AC78776DD8C26b',
            value: 0,
            data: data,
            operation: 0,
            safeTxGas: 0, // review
            baseGas: 66909, // review
            gasPrice: 0,
            gasToken: config.ZERO_ADDRESS,
            refundReceiver: config.ZERO_ADDRESS,
            signatures: signature
        }
        const execTransactionMetaTxApiId = '6fdc23f8-4d25-40f8-b750-7ae2fd1234ac';
        const metaTxBody = {
            from: walletOwner,
            apiId: execTransactionMetaTxApiId,
            params: [req.to, req.value, req.data, req.operation, req.safeTxGas, req.baseGas, req.gasPrice, req.gasToken, req.refundReceiver, req.signatures],
            to: walletAddress,
        };

        // .execTransaction(
        //     safeTx.to,
        //     safeTx.value,
        //     safeTx.data,
        //     safeTx.operation,
        //     safeTx.safeTxGas,
        //     safeTx.baseGas,
        //     safeTx.gasPrice,
        //     safeTx.gasToken,
        //     safeTx.refundReceiver,
        //     signature
        //   )
        
        // call execTransction directly
        const txResponse = await fetch(
            `${config.baseURL}/api/v2/meta-tx/native`,
            {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                "x-api-key": this.biconomyAttributes.apiKey,
                },
                body: JSON.stringify(metaTxBody),
            }
        );

        return await txResponse.json();
    }

    async _getExecTransactionMetaTxApiId() {
        const method = 'execTransaction';
        return this.biconomyAttributes.dappAPIMap[this.walletFactoryAddress.toLowerCase()][
            method.toString()
        ];
    }

    async safeSignTypedData (
        walletAddress,
        biconomyWalletMetaTransactionBody
      ) {
        const signer = this.signer;
        console.log("signer", this.signer);

        return {
          data: await signer._signTypedData(
            { verifyingContract: walletAddress, chainId: this.networkId },
            EIP712_SAFE_TX_TYPE,
            biconomyWalletMetaTransactionBody
          ),
        };
      };
}

module.exports = BiconomyWalletClient;
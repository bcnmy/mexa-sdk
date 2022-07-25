/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable import/no-cycle */
/* eslint-disable max-len */
import { ethers } from 'ethers';
import {
  BiconomyWalletClientParamsType,
  BuildExecTransactionParamsType,
  CheckIfWalletExistsAndDeployParamsType,
  CheckIfWalletExistsParamsType,
  SendBiconomyWalletTransactionsParamsType,
} from './common/biconomy-wallet-client-types';
import {
  baseWalletAbi,
  walletFactoryAbi,
  entryPointAbi,
} from './abis';
import {
  config,
} from './config';
import { logMessage } from './utils';

const getSignatureParameters = (signature: string) => {
  if (!ethers.utils.isHexString(signature)) {
    throw new Error(
      'Given value "'.concat(signature, '" is not a valid hex string.'),
    );
  }
  const r = signature.slice(0, 66);
  const s = '0x'.concat(signature.slice(66, 130));
  let v = ethers.BigNumber.from('0x'.concat(signature.slice(130, 132))).toNumber();
  if (![27, 28].includes(v)) v += 27;
  return {
    r,
    s,
    v,
  };
};

/**
 * Class to provide methods for biconomy wallet deployment,
 *  signature building and sending the transaction
 */
export class BiconomyWalletClient {
  walletFactoryAddress;

  baseWalletAddress;

  entryPointAddress;

  handlerAddress;

  networkId;

  walletFactory;

  baseWallet;

  entryPoint;

  biconomyProvider;

  constructor(biconomyWalletClientParams: BiconomyWalletClientParamsType) {
    const {
      biconomyProvider,
      walletFactoryAddress,
      baseWalletAddress,
      entryPointAddress,
      handlerAddress,
      networkId,
    } = biconomyWalletClientParams;
    this.biconomyProvider = biconomyProvider;
    this.walletFactoryAddress = walletFactoryAddress;
    this.baseWalletAddress = baseWalletAddress;
    this.entryPointAddress = entryPointAddress;
    this.handlerAddress = handlerAddress;

    this.networkId = networkId;

    this.walletFactory = new ethers.Contract(
      this.walletFactoryAddress,
      walletFactoryAbi,
      this.biconomyProvider.getEthersProvider(),
    );
    this.baseWallet = new ethers.Contract(
      this.baseWalletAddress,
      baseWalletAbi,
      this.biconomyProvider.getEthersProvider(),
    );
    this.entryPoint = new ethers.Contract(
      this.entryPointAddress,
      entryPointAbi,
      this.biconomyProvider.getEthersProvider(),
    );
  }

  async checkIfWalletExists(checkIfWalletExistsParams: CheckIfWalletExistsParamsType) {
    const { eoa, index } = checkIfWalletExistsParams;
    // Read calls would need providerOrSigner
    const walletAddress = await this.walletFactory.getAddressForCounterfactualWallet(eoa, index);
    const doesWalletExist = await this.walletFactory.isWalletExist(walletAddress);
    if (doesWalletExist) {
      return {
        doesWalletExist,
        walletAddress,
      };
    }
    return {
      doesWalletExist,
      walletAddress,
    };
  }

  async checkIfWalletExistsAndDeploy(
    checkIfWalletExistsAndDeployParams: CheckIfWalletExistsAndDeployParamsType,
  ) {
    const { eoa, index } = checkIfWalletExistsAndDeployParams;
    const walletAddress = await this.walletFactory.getAddressForCounterfactualWallet(eoa, index);
    const doesWalletExist = await this.walletFactory.isWalletExist[walletAddress];
    this.walletFactory = this.walletFactory.connect(this.biconomyProvider.getSignerByAddress(eoa));
    if (!doesWalletExist) {
      const executionData = await this.walletFactory.populateTransaction.deployCounterFactualWallet(eoa, this.entryPointAddress, this.handlerAddress, index);
      const dispatchProvider = this.biconomyProvider.getEthersProvider();

      const txParams = {
        data: executionData.data,
        to: this.walletFactory.address,
        from: eoa,
      };

      try {
        await dispatchProvider.send('eth_sendTransaction', [txParams]);
      } catch (err) {
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
  async buildExecTransaction(buildExecTransactionParams: BuildExecTransactionParamsType) {
    const {
      data, to, walletAddress, batchId = 0,
    } = buildExecTransactionParams;
    this.baseWallet = this.baseWallet.attach(walletAddress);

    const nonce = await this.baseWallet.getNonce(batchId);
    return {
      to,
      value: 0,
      data,
      operation: 0,
      targetTxGas: 0,
      baseGas: 0,
      gasPrice: 0,
      gasToken: config.ZERO_ADDRESS,
      refundReceiver: config.ZERO_ADDRESS,
      nonce,
    };
  }

  async sendBiconomyWalletTransaction(
    sendBiconomyWalletTransactionParams: SendBiconomyWalletTransactionsParamsType,
  ) {
    const {
      execTransactionBody, walletAddress, signatureType, batchId = 0, webHookAttributes,
    } = sendBiconomyWalletTransactionParams;
    let { signature } = sendBiconomyWalletTransactionParams;

    const transaction = {
      to: execTransactionBody.to,
      value: execTransactionBody.value,
      data: execTransactionBody.data,
      operation: execTransactionBody.operation,
      targetTxGas: execTransactionBody.targetTxGas,
    };

    const refundInfo = {
      baseGas: execTransactionBody.baseGas,
      gasPrice: execTransactionBody.gasPrice,
      gasToken: execTransactionBody.gasToken,
      refundReceiver: execTransactionBody.refundReceiver,
    };

    if (!signature) {
      if (signatureType === 'PERSONAL_SIGN') {
        const transactionHash = await this.baseWallet.getTransactionHash(
          execTransactionBody.to,
          execTransactionBody.value,
          execTransactionBody.data,
          execTransactionBody.operation,
          execTransactionBody.targetTxGas,
          execTransactionBody.baseGas,
          execTransactionBody.gasPrice,
          execTransactionBody.gasToken,
          execTransactionBody.refundReceiver,
          execTransactionBody.nonce,
        );
        // Review targetProvider vs provider
        signature = await this.biconomyProvider.getEthersProvider().getSigner().signMessage(ethers.utils.arrayify(transactionHash));
        const { r, s, v } = getSignatureParameters(signature as string);
        const newV = ethers.BigNumber.from(v + 4).toHexString();
        signature = r + s.slice(2) + newV.slice(2);
      } else {
        signature = await this.biconomyProvider.getEthersProvider().getSigner()._signTypedData(
          { verifyingContract: walletAddress, chainId: this.networkId },
          config.EIP712_WALLET_TX_TYPE,
          execTransactionBody,
        );
      }
    }
    this.baseWallet = this.baseWallet.attach(walletAddress);

    this.baseWallet = this.baseWallet.connect(this.biconomyProvider.getSignerByAddress(walletAddress));

    const executionData = await this.baseWallet.populateTransaction.execTransaction(
      transaction,
      batchId,
      refundInfo,
      signature,
    );
    const dispatchProvider = this.biconomyProvider.getEthersProvider();

    // append webwallet_address key in this object webHookAttributes
    const owner = await this.baseWallet.owner(); // eoa
    if (webHookAttributes && webHookAttributes.webHookData) {
      webHookAttributes.webHookData.webwallet_address = owner;
    }

    const txParams = {
      data: executionData.data,
      to: this.baseWallet.address,
      from: owner,
      webHookAttributes: webHookAttributes || null,
    };

    let tx;
    try {
      tx = await dispatchProvider.send('eth_sendTransaction', [txParams]);
    } catch (err) {
      // handle conditional rejections in this stack trace
      logMessage(JSON.stringify(err));
      throw err;
    }
    return tx;
  }
}

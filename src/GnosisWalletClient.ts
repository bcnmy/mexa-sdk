import { ethers } from 'ethers';
import axios from 'axios';
import { gnosisSafeAbi, gnosisSafeProxyFactoryAbi } from './abis';
import { DeployGnosisSafeParamsType, GnosisWalletClientParams, SendGnosisSafeTransactionParamsType } from './common/gnosis-wallet-client-types';
import {
  config,
} from './config';

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
export class GnosisWalletClient {
  ethersProvider;

  apiKey;

  networkId;

  gnosisSafeProxyFactoryAddress;

  gnosisSafeAddress;

  safeMasterCopy;

  gnosisFactory;

  constructor(gnosisClientParameters: GnosisWalletClientParams) {
    const {
      ethersProvider,
      gnosisSafeProxyFactoryAddress,
      gnosisSafeAddress,
      networkId,
      apiKey,
    } = gnosisClientParameters;

    this.ethersProvider = ethersProvider;
    this.networkId = networkId;
    this.apiKey = apiKey;
    this.gnosisSafeProxyFactoryAddress = gnosisSafeProxyFactoryAddress;
    this.gnosisSafeAddress = gnosisSafeAddress;

    this.safeMasterCopy = new ethers.Contract(
      this.gnosisSafeAddress,
      gnosisSafeAbi,
      this.ethersProvider,
    );

    this.gnosisFactory = new ethers.Contract(
      this.gnosisSafeProxyFactoryAddress,
      gnosisSafeProxyFactoryAbi,
      this.ethersProvider,
    );
  }

  async deployGnosisSafe(deployGnosisSafeParams: DeployGnosisSafeParamsType) {
    const { ownerAddress } = deployGnosisSafeParams;
    const creationData = this.safeMasterCopy.setup(
      [ownerAddress],
      1,
      '0x0000000000000000000000000000000000000000',
      '0x0',
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      0,
      '0x0000000000000000000000000000000000000000',
    ).encodeABI();

    // TODO check return value
    const tx = this.gnosisFactory.createProxy(this.gnosisSafeAddress, creationData);
    return tx;
  }

  async whitelistTargetContract(authToken: string, contractAddresses: Array<string>) {
    await axios.post(
      `${config.metaEntryPointBaseUrl}/api/v1/sdk/dapp/gnosis/whitelist-target`,
      {
        contractAddresses,
      },
      {
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          authToken,
          apiKey: this.apiKey,
          version: config.PACKAGE_VERSION,
        },
      },
    );
  }

  async sendGnosisSafeTransaction(
    sendGnosisSafeTransactionParams: SendGnosisSafeTransactionParamsType,
  ) {
    const {
      execTransactionBody,
      signatureType,
      ownerAddress,
      walletAddress,
    } = sendGnosisSafeTransactionParams;
    let { signature } = sendGnosisSafeTransactionParams;

    if (!signature) {
      if (signatureType === 'PERSONAL_SIGN') {
        const nonce = await this.safeMasterCopy.nonce();
        const transactionHash = await this.safeMasterCopy.getTransactionHash(
          execTransactionBody.to,
          execTransactionBody.valueWei,
          execTransactionBody.data,
          execTransactionBody.operation,
          execTransactionBody.txGasEstimate,
          execTransactionBody.baseGasEstimate,
          execTransactionBody.gasPrice,
          execTransactionBody.gasToken,
          execTransactionBody.executor,
          nonce,
        );

        signature = await this.ethersProvider.send('personal_sign', [ownerAddress, transactionHash]);
        const { r, s, v } = getSignatureParameters(signature as string);
        signature = `${r}${s.substring(2)}${Number(v + 4).toString(16)}`;
      } else {
        signature = await this.ethersProvider.getSigner()._signTypedData(
          { verifyingContract: walletAddress, chainId: this.networkId },
          config.EIP712_SAFE_TX_TYPE,
          execTransactionBody,
        );
      }
    }

    const transaction = await this.safeMasterCopy.execTransaction(
      execTransactionBody.to,
      execTransactionBody.valueWei,
      execTransactionBody.data,
      execTransactionBody.operation,
      execTransactionBody.txGasEstimate,
      execTransactionBody.baseGasEstimate,
      execTransactionBody.gasPrice,
      execTransactionBody.gasToken,
      execTransactionBody.executor,
      signature,
    );
    return transaction;
  }
}
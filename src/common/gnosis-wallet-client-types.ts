import { ethers } from 'ethers';

export type GnosisWalletClientParams = {
  ethersProvider: ethers.providers.Web3Provider,
  networkId: number,
  apiKey: string,
  gnosisSafeProxyFactoryAddress: string,
  gnosisSafeAddress: string,
};

export type DeployGnosisSafeParamsType = {
  ownerAddress: string
};

export type ExecTransactionBodyType = {
  operation: number,
  gasPrice: number,
  gasToken: string,
  executor: string,
  to: string,
  valueWei: number,
  data: string,
  txGasEstimate: number,
  baseGasEstimate: number,
};

export type SendGnosisSafeTransactionParamsType = {
  execTransactionBody: ExecTransactionBodyType,
  ownerAddress: string,
  walletAddress: string,
  signature?: string,
  signatureType?: string
};

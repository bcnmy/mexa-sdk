import { ExternalProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';

export type CheckIfWalletExistsAndDeployParamsType = {
  eoa: string,
  index: number
};

export type CheckIfWalletExistsParamsType = CheckIfWalletExistsAndDeployParamsType;

export type BuildExecTransactionParamsType = {
  data: string,
  to: string,
  walletAddress: string,
  batchId: number,
};

export type ExecTransactionBodyType = {
  to: string,
  value: number,
  data: string,
  operation: number,
  targetTxGas: number,
  baseGas: number,
  gasPrice: number,
  gasToken: string,
  refundReceiver: string,
  nonce: number,
};

export type SendBiconomyWalletTransactionsParamsType = {
  execTransactionBody: ExecTransactionBodyType,
  batchId: number,
  walletAddress: string,
  signatureType: string,
  signature?: string,
  webHookAttributes: any
};

export type BiconomyWalletClientParamsType = {
  provider: ExternalProvider,
  ethersProvider: ethers.providers.Web3Provider,
  walletFactoryAddress: string,
  baseWalletAddress: string,
  entryPointAddress: string,
  handlerAddress: string,
  networkId: number,
};

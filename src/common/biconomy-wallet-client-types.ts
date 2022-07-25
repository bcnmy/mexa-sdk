/* eslint-disable import/no-cycle */
import { Biconomy } from '..';

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
  biconomyProvider: Biconomy,
  walletFactoryAddress: string,
  baseWalletAddress: string,
  entryPointAddress: string,
  handlerAddress: string,
  networkId: number,
};

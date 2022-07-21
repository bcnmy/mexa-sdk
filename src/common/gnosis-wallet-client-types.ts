import { Biconomy } from '..';

export type GnosisWalletClientParams = {
  biconomyProvider: Biconomy,
  networkId: number,
  apiKey: string,
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

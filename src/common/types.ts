import { Types } from 'mongoose';
import { ethers } from 'ethers';

export type OptionsType = {
  apiKey: string,
  debug?: boolean,
  strictMode?: boolean,
  jsonRpcUrl?: string,
  contractAddresses: string[],
};

export type SignatureParametersPerContractAddressType = {
  [key: string]: {
    r: string,
    s: string,
    v : number
  }
};

export type DappApiMapType = {
  [key: string]: MetaApiType
};

export type InterfaceMapType = {
  [key: string]: ethers.utils.Interface
};

export type SmartContractMapType = {
  [key: string]: ethers.ContractInterface
};

export type SmartContractMetaTransactionMapType = {
  [key: string]: string
};

export type SmartContractTrustedForwarderMapType = {
  [key: string]: string
};

export type ForwarderDomainData = {
  name: string,
  version: string,
  verifyingContract: string,
  salt: string
};

export type SystemInfoResponse = {
  code: string,
  data: any
};

export enum ContractMetaTransactionType {
  DEFAULT = 'CUSTOM',
  EIP2771 = 'TRUSTED_FORWARDER',
}

export type ForwardRequestType = Array<{
  name: string,
  type: string,
}>;

export type ForwarderDomainType = ForwardRequestType;

export type HandleSendTransactionParamsType = {
  params?: Array<any>
  fallback: () => Promise<any> | void | undefined
};

export type FindRightForwarderParamsType = {
  to: string,
  smartContractTrustedForwarderMap: SmartContractTrustedForwarderMapType,
  provider: any,
  forwarderAddresses: Array<string>
  forwarderAddress: string
};
export type SendSingedTransactionParamsType = HandleSendTransactionParamsType;

export interface JsonRpcRequest {
  id: string | undefined;
  jsonrpc: '2.0';
  method: string;
  params?: Array<any>;
}

export interface JsonRpcResponse {
  id: string | undefined;
  jsonrpc: '2.0';
  method: string;
  result?: unknown;
  error?: Error;
}

export type JsonRpcCallback = (error: Error, response: JsonRpcResponse) => unknown;

export type SmartContractType = {
  _id?: Object,
  dappId: Types.ObjectId,
  name: string,
  abi: JSON,
  type: string,
  walletType: string,
  metaTransactionType: string,
  address: string,
  createdOn: number,
  createdBy: Types.ObjectId,
};

export type MetaApiType = {
  apiId: string,
  name: string,
  dappId: Types.ObjectId,
  contractId: Types.ObjectId,
  method: string,
  methodType: string,
  apiType: string,
  createdOn: number,
  createdBy: Types.ObjectId,
  contractAddress: string
};

export type DomainDataType = {
  name: string,
  version: string,
  verifyingContract: string,
  salt: string
};

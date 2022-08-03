import { Types } from 'mongoose';
import { ethers } from 'ethers';
export declare type OptionsType = {
    apiKey: string;
    debug?: boolean;
    strictMode?: boolean;
    jsonRpcUrl?: string;
    contractAddresses: string[];
};
export declare type SignatureParametersPerContractAddressType = {
    [key: string]: {
        r: string;
        s: string;
        v: number;
    };
};
export declare type DappApiMapType = {
    [key: string]: MetaApiType;
};
export declare type InterfaceMapType = {
    [key: string]: ethers.utils.Interface;
};
export declare type SmartContractMapType = {
    [key: string]: ethers.ContractInterface;
};
export declare type SmartContractMetaTransactionMapType = {
    [key: string]: string;
};
export declare type SmartContractTrustedForwarderMapType = {
    [key: string]: string;
};
export declare type ForwarderDomainData = {
    name: string;
    version: string;
    verifyingContract: string;
    salt: string;
};
export declare type SystemInfoResponse = {
    code: string;
    data: any;
};
export declare enum ContractMetaTransactionType {
    DEFAULT = "CUSTOM",
    EIP2771 = "TRUSTED_FORWARDER"
}
export declare type ForwardRequestType = Array<{
    name: string;
    type: string;
}>;
export declare type ForwarderDomainType = ForwardRequestType;
export declare type HandleSendTransactionParamsType = {
    params?: Array<any>;
    fallback: () => Promise<any> | void | undefined;
};
export declare type FindRightForwarderParamsType = {
    to: string;
    smartContractTrustedForwarderMap: SmartContractTrustedForwarderMapType;
    provider: any;
    forwarderAddresses: Array<string>;
    forwarderAddress: string;
};
export declare type SendSingedTransactionParamsType = HandleSendTransactionParamsType;
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
export declare type JsonRpcCallback = (error: Error, response: JsonRpcResponse) => unknown;
export declare type SmartContractType = {
    _id?: Object;
    dappId: Types.ObjectId;
    name: string;
    abi: JSON;
    type: string;
    walletType: string;
    metaTransactionType: string;
    address: string;
    createdOn: number;
    createdBy: Types.ObjectId;
};
export declare type MetaApiType = {
    apiId: string;
    name: string;
    dappId: Types.ObjectId;
    contractId: Types.ObjectId;
    method: string;
    methodType: string;
    apiType: string;
    createdOn: number;
    createdBy: Types.ObjectId;
    contractAddress: string;
};
export declare type DomainDataType = {
    name: string;
    version: string;
    verifyingContract: string;
    salt: string;
};
//# sourceMappingURL=types.d.ts.map
/// <reference types="node" />
/**
 * @dev Biconomy class that is the entry point
 */
import EventEmitter from 'events';
import { ExternalProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { DappApiMapType, ForwarderDomainData, ForwarderDomainType, ForwardRequestType, InterfaceMapType, JsonRpcCallback, JsonRpcRequest, OptionsType, SmartContractMapType, SmartContractMetaTransactionMapType, SmartContractTrustedForwarderMapType } from './common/types';
import { handleSendTransaction } from './helpers/handle-send-transaction-helper';
import { sendSignedTransaction } from './helpers/send-signed-transaction-helper';
import { getSystemInfo } from './helpers/get-system-info-helper';
import { getSignatureEIP712, getSignaturePersonal } from './helpers/signature-helpers';
import { sendTransaction } from './helpers/send-transaction-helper';
import { buildSignatureCustomEIP712MetaTransaction, buildSignatureCustomPersonalSignMetaTransaction } from './helpers/meta-transaction-custom-helpers';
export declare class Biconomy extends EventEmitter {
    apiKey: string;
    private externalProvider;
    readOnlyProvider?: ethers.providers.JsonRpcProvider;
    provider: ExternalProvider;
    dappApiMap: DappApiMapType;
    interfaceMap: InterfaceMapType;
    smartContractMap: SmartContractMapType;
    smartContractMetaTransactionMap: SmartContractMetaTransactionMapType;
    smartContractTrustedForwarderMap: SmartContractTrustedForwarderMapType;
    strictMode: boolean;
    signer?: ethers.providers.JsonRpcSigner;
    forwarderDomainType?: ForwarderDomainType;
    defaultMetaTransaction?: string;
    trustedForwarderMetaTransaction?: string;
    forwardRequestType?: ForwardRequestType;
    forwarderDomainData?: ForwarderDomainData;
    forwarderDomainDetails?: Array<ForwarderDomainData>;
    eip712Sign?: string;
    personalSign?: string;
    biconomyForwarder?: ethers.Contract;
    forwarderAddresses?: string[];
    forwarderAddress?: string;
    walletFactoryAddress?: string;
    baseWalletAddress?: string;
    entryPointAddress?: string;
    handlerAddress?: string;
    gnosisSafeProxyFactoryAddress?: string;
    gnosisSafeAddress?: string;
    ethersProvider: ethers.providers.Web3Provider;
    networkId?: number;
    dappId?: string;
    getSystemInfo: typeof getSystemInfo;
    handleSendTransaction: typeof handleSendTransaction;
    sendTransaction: typeof sendTransaction;
    sendSignedTransaction: typeof sendSignedTransaction;
    getSignatureEIP712: typeof getSignatureEIP712;
    getSignaturePersonal: typeof getSignaturePersonal;
    contractAddresses?: string[];
    buildSignatureCustomEIP712MetaTransaction: typeof buildSignatureCustomEIP712MetaTransaction;
    buildSignatureCustomPersonalSignMetaTransaction: typeof buildSignatureCustomPersonalSignMetaTransaction;
    clientMessenger: any;
    /**
     * constructor would initiliase providers and set values passed in options
     * strictMode true would return error, strictMode false would fallback to default provider
     * externalProvider is the provider dev passes (ex. window.ethereum)
     * this.provider is the proxy provider object that would intercept all rpc calls for the SDK
     */
    constructor(provider: ExternalProvider, options: OptionsType);
    private proxyFactory;
    proxyProvider: {
        get: (target: ExternalProvider, prop: string, ...args: any[]) => any;
    };
    handleRpcSendType1(payload: JsonRpcRequest, callback: JsonRpcCallback): Promise<any>;
    handleRpcSendType2(method: string, params?: Array<unknown>): Promise<any>;
    handleRpcSendType3(payload: JsonRpcRequest): Promise<any>;
    handleRpcSend(...args: any[]): Promise<any>;
    handleRpcSendAsync(payload: JsonRpcRequest, callback: JsonRpcCallback): Promise<any>;
    handleRpcRequest({ method, params }: {
        method: string;
        params: string[];
    }): Promise<any>;
    /**
     * Function to initialize the biconomy object with DApp information.
     * It fetches the dapp's smart contract from biconomy database
     * and initialize the decoders for each smart
     * contract which will be used to decode information during function calls.
     * */
    init(): Promise<unknown>;
    getDappData(): Promise<void>;
    getTransactionStatus(transactionId: string): Promise<any>;
}
//# sourceMappingURL=index.d.ts.map
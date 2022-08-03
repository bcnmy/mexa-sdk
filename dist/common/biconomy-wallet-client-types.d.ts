import { ExternalProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
export declare type CheckIfWalletExistsAndDeployParamsType = {
    eoa: string;
    index: number;
};
export declare type CheckIfWalletExistsParamsType = CheckIfWalletExistsAndDeployParamsType;
export declare type BuildExecTransactionParamsType = {
    data: string;
    to: string;
    walletAddress: string;
    batchId: number;
};
export declare type ExecTransactionBodyType = {
    to: string;
    value: number;
    data: string;
    operation: number;
    targetTxGas: number;
    baseGas: number;
    gasPrice: number;
    gasToken: string;
    refundReceiver: string;
    nonce: number;
};
export declare type SendBiconomyWalletTransactionsParamsType = {
    execTransactionBody: ExecTransactionBodyType;
    batchId: number;
    walletAddress: string;
    signatureType: string;
    signature?: string;
    webHookAttributes: any;
};
export declare type BiconomyWalletClientParamsType = {
    provider: ExternalProvider;
    ethersProvider: ethers.providers.Web3Provider;
    walletFactoryAddress: string;
    baseWalletAddress: string;
    entryPointAddress: string;
    handlerAddress: string;
    networkId: number;
};
//# sourceMappingURL=biconomy-wallet-client-types.d.ts.map
import { ethers } from 'ethers';
export declare type GnosisWalletClientParams = {
    ethersProvider: ethers.providers.Web3Provider;
    networkId: number;
    apiKey: string;
    gnosisSafeProxyFactoryAddress: string;
    gnosisSafeAddress: string;
};
export declare type DeployGnosisSafeParamsType = {
    ownerAddress: string;
};
export declare type ExecTransactionBodyType = {
    operation: number;
    gasPrice: number;
    gasToken: string;
    executor: string;
    to: string;
    valueWei: number;
    data: string;
    txGasEstimate: number;
    baseGasEstimate: number;
};
export declare type SendGnosisSafeTransactionParamsType = {
    execTransactionBody: ExecTransactionBodyType;
    ownerAddress: string;
    walletAddress: string;
    signature?: string;
    signatureType?: string;
};
//# sourceMappingURL=gnosis-wallet-client-types.d.ts.map
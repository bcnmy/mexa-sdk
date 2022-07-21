import { Biconomy } from '..';
export declare type GnosisWalletClientParams = {
    biconomyProvider: Biconomy;
    networkId: number;
    apiKey: string;
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
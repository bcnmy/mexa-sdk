import { GnosisWalletClientParams } from './common/gnosis-wallet-client-types';
export declare class GnosisWalletClient {
    biconomyProvider: import(".").Biconomy;
    apiKey: string;
    networkId: number;
    ethAdapter: any;
    constructor(gnosisClientParameters: GnosisWalletClientParams);
    setEthersAdapter(userAddress: string): Promise<void>;
    createNewGnosisSafe(): Promise<void>;
    connectToGnosisSafe(): Promise<void>;
    buildSafeTransaction(): Promise<void>;
    executeSafeTransaction(): Promise<void>;
    executeMultiSendSafeTransaction(): Promise<void>;
    whitelistTargetContract(authToken: string, contractAddresses: Array<string>): Promise<void>;
}
//# sourceMappingURL=GnosisWalletClient.d.ts.map
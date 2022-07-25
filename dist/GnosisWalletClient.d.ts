import EthersAdapter from '@gnosis.pm/safe-ethers-lib';
import Web3Adapter from '@gnosis.pm/safe-web3-lib';
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk';
import { SafeTransaction } from '@gnosis.pm/safe-core-sdk-types';
import { GnosisWalletClientParams } from './common/gnosis-wallet-client-types';
export declare class GnosisWalletClient {
    biconomyProvider: import(".").Biconomy;
    apiKey: string;
    networkId: number;
    ethAdapter?: EthersAdapter | Web3Adapter;
    safeFactory?: SafeFactory;
    safeSdk?: Safe;
    constructor(gnosisClientParameters: GnosisWalletClientParams);
    setEthersAdapter(userAddress: string): Promise<boolean>;
    createNewGnosisSafe(safeAccountConfig: SafeAccountConfig): Promise<Safe>;
    connectToGnosisSafe(safeAddress: string): Promise<Safe>;
    executeSafeTransaction(safeTransaction: SafeTransaction, gasLimit: number): Promise<import("@gnosis.pm/safe-core-sdk-types").TransactionResult>;
    whitelistTargetContract(authToken: string, contractAddresses: Array<string>): Promise<void>;
}
//# sourceMappingURL=GnosisWalletClient.d.ts.map
import { ethers } from 'ethers';
import { DeployGnosisSafeParamsType, GnosisWalletClientParams, SendGnosisSafeTransactionParamsType } from './common/gnosis-wallet-client-types';
export declare class GnosisWalletClient {
    ethersProvider: ethers.providers.Web3Provider;
    apiKey: string;
    networkId: number;
    gnosisSafeProxyFactoryAddress: string;
    gnosisSafeAddress: string;
    safeMasterCopy: ethers.Contract;
    gnosisFactory: ethers.Contract;
    constructor(gnosisClientParameters: GnosisWalletClientParams);
    deployGnosisSafe(deployGnosisSafeParams: DeployGnosisSafeParamsType): Promise<any>;
    whitelistTargetContract(authToken: string, contractAddresses: Array<string>): Promise<void>;
    sendGnosisSafeTransaction(sendGnosisSafeTransactionParams: SendGnosisSafeTransactionParamsType): Promise<any>;
}
//# sourceMappingURL=GnosisWalletClient.d.ts.map
import { ethers } from 'ethers';
import { BiconomyWalletClientParamsType, BuildExecTransactionParamsType, CheckIfWalletExistsAndDeployParamsType, CheckIfWalletExistsParamsType, SendBiconomyWalletTransactionsParamsType } from './common/biconomy-wallet-client-types';
/**
 * Class to provide methods for biconomy wallet deployment,
 *  signature building and sending the transaction
 */
export declare class BiconomyWalletClient {
    walletFactoryAddress: string;
    baseWalletAddress: string;
    entryPointAddress: string;
    handlerAddress: string;
    networkId: number;
    walletFactory: ethers.Contract;
    baseWallet: ethers.Contract;
    entryPoint: ethers.Contract;
    biconomyProvider: import(".").Biconomy;
    constructor(biconomyWalletClientParams: BiconomyWalletClientParamsType);
    checkIfWalletExists(checkIfWalletExistsParams: CheckIfWalletExistsParamsType): Promise<{
        doesWalletExist: any;
        walletAddress: any;
    }>;
    checkIfWalletExistsAndDeploy(checkIfWalletExistsAndDeployParams: CheckIfWalletExistsAndDeployParamsType): Promise<any>;
    buildExecTransaction(buildExecTransactionParams: BuildExecTransactionParamsType): Promise<{
        to: string;
        value: number;
        data: string;
        operation: number;
        targetTxGas: number;
        baseGas: number;
        gasPrice: number;
        gasToken: string;
        refundReceiver: string;
        nonce: any;
    }>;
    sendBiconomyWalletTransaction(sendBiconomyWalletTransactionParams: SendBiconomyWalletTransactionsParamsType): Promise<any>;
}
//# sourceMappingURL=BiconomyWalletClient.d.ts.map
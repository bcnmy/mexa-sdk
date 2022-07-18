import { ethers } from 'ethers';
import { FindRightForwarderParamsType } from '../common/types';
export declare const findTheRightForwarder: (findTheRightForwarderParams: FindRightForwarderParamsType) => Promise<string>;
export declare const buildForwardTxRequest: (account: string, to: string, gasLimitNum: number, data: any, biconomyForwarder: ethers.Contract, batchId?: number) => Promise<{
    request: {
        from: string;
        to: string;
        token: string;
        txGas: number;
        tokenGasPrice: string;
        batchId: number;
        batchNonce: number;
        deadline: number;
        data: any;
    };
}>;
export declare const getDomainSeperator: (biconomyForwarderDomainData: any) => string;
//# sourceMappingURL=meta-transaction-EIP2771-helpers.d.ts.map
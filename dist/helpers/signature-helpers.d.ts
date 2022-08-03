import { ethers } from 'ethers';
import { ToBufferInputTypes } from 'ethereumjs-util';
import type { Biconomy } from '..';
import { ForwarderDomainData, ForwarderDomainType, ForwardRequestType } from '../common/types';
/**
 * Method to get the signature parameters.
 * @param signature String representing a signature
 * */
export declare const getSignatureParameters: (signature: string) => {
    r: string;
    s: string;
    v: number;
};
export declare function getEIP712ForwardMessageToSign(forwarderDomainDetails: ForwarderDomainData[], forwarderDomainType: ForwarderDomainType, forwardRequestType: ForwardRequestType, request: any, domainData: any): Promise<string>;
export declare function getSignatureEIP712(this: Biconomy, account: string, request: any, domainData: any, type: string): Promise<string | {
    error: string;
    code: string;
}>;
export declare function getPersonalForwardMessageToSign(request: {
    from: string;
    to: string;
    token: string;
    txGas: number;
    tokenGasPrice: number;
    batchId: number;
    batchNonce: number;
    deadline: number;
    data: ethers.utils.BytesLike;
}): any;
export declare function getPersonalCustomMessageToSign(request: {
    nonce: number;
    contractAddress: string;
    chainId: number;
    functionSignature: ToBufferInputTypes;
}): any;
/**
 * Method to get the signature parameters.
 * @param engine Object containing the signer, walletprovider and originalprovider
 * @param request Object containing the request parameters
 * */
export declare function getSignaturePersonal(this: Biconomy, request: any): Promise<unknown>;
//# sourceMappingURL=signature-helpers.d.ts.map
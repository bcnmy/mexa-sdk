import type { Biconomy } from '..';
import { DomainDataType } from '../common/types';
export declare function buildSignatureCustomEIP712MetaTransaction(this: Biconomy, userAddress: string, nonce: number, functionSignature: string, domainData: DomainDataType): Promise<{
    r: string;
    s: string;
    v: number;
}>;
export declare function buildSignatureCustomPersonalSignMetaTransaction(this: Biconomy, nonce: number, functionSignature: string): Promise<void>;
//# sourceMappingURL=meta-transaction-custom-helpers.d.ts.map
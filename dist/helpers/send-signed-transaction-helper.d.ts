import type { Biconomy } from '..';
import { SendSingedTransactionParamsType } from '../common/types';
/**
 * Method used to handle transaction initiated using web3.eth.sendSignedTransaction method
 * It extracts rawTransaction from payload and decode it to get required information like from, to,
 * data, gasLimit to create the payload for biconomy meta transaction API.
 * In case of Native meta transaction, payload just contains rawTransaction
 * In case of contract based meta transaction, payload contains rawTransaction and signature wrapped
 * in a json object.
 *
 * @param {Object} this Reference to this SDK instance
 * @param {Object} payload Payload data
 */
export declare function sendSignedTransaction(this: Biconomy, sendSignedTransactionParams: SendSingedTransactionParamsType): Promise<unknown>;
//# sourceMappingURL=send-signed-transaction-helper.d.ts.map
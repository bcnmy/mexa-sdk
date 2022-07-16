import { HandleSendTransactionParamsType } from '../common/types';
import type { Biconomy } from '..';
/**
  * Function decodes the parameter in payload and gets the user signature using eth_signTypedData_v4
  * method and send the request to biconomy for processing and call the callback method 'end'
  * with transaction hash.
  * This is an internal function that is called
  * while intercepting eth_sendTransaction RPC method call.
* */
export declare function handleSendTransaction(this: Biconomy, handleSendTransactionParams: HandleSendTransactionParamsType): Promise<any>;
//# sourceMappingURL=handle-send-transaction-helper.d.ts.map
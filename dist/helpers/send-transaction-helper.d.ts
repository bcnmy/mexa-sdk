import type { Biconomy } from '..';
/**
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param this Object representing biconomy provider this
 * @param account User selected account on current wallet
 * @param data Data to be sent to biconomy server having transaction data
 * */
export declare function sendTransaction(this: Biconomy, account: string, data: any, fallback: () => Promise<any> | void | undefined): Promise<any>;
//# sourceMappingURL=send-transaction-helper.d.ts.map
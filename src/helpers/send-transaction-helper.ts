import axios, { AxiosRequestConfig } from 'axios';
import type { Biconomy } from '..';
import { BICONOMY_RESPONSE_CODES, config } from '../config';
import { logErrorMessage, logMessage } from '../utils';
import { mexaSdkClientMessenger } from './client-messaging-helper';


/**
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param this Object representing biconomy provider this
 * @param account User selected account on current wallet
 * @param data Data to be sent to biconomy server having transaction data
 * */
export async function sendTransaction(
  this: Biconomy,
  account: string,
  data: any,
  fallback: () => Promise<any> | void | undefined,
) {
  try {
    if (!this || !account || !data) {
      return undefined;
    }

    const url = `${config.metaEntryPointBaseUrl}/api/v1/native`;
    const jsonData = JSON.stringify(data);
    const options: AxiosRequestConfig = {
      url,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json;charset=utf-8',
        version: config.PACKAGE_VERSION,
      },
      timeout: 600000, // 10 min
    };

    logMessage('request body');
    logMessage(jsonData);

    const result = await axios.post(url, jsonData, options);
    logMessage(result);

    if (
      result.data
      && result.data.transactionId
      && result.status === BICONOMY_RESPONSE_CODES.SUCCESS
    ) {
      mexaSdkClientMessenger(
        this,
        {
          transactionId: result.data.transactionId,
        },
      );
      return {
        transactionId: result.data.transactionId,
      };
    } if (result.status === BICONOMY_RESPONSE_CODES.BAD_REQUEST) {
      await fallback();
      return {
        transactionId: result.data.transactionId,
      };
    }
    const error: any = {};
    error.code = result.status;
    error.message = result.statusText || 'Error in native meta api call';
    return {
      error: error.toString(),
      transcionId: result.data.transactionId,
    };
  } catch (error) {
    logErrorMessage(error);
    return error;
  }
}

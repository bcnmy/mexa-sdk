import axios from 'axios';
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
  fallback: () => Promise<any> | void | undefined
) {
  try {
    if (!this || !account || !data) {
      return undefined;
    }

    logMessage('request body');
    logMessage(JSON.stringify(data));

    const response = await axios.post(
      `${config.metaEntryPointBaseUrl}/api/v1/native`,
      data,
      {
        timeout: 600000,
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json;charset=utf-8',
          version: config.PACKAGE_VERSION,
        },
      }
    );

    logMessage(response);
    const result = response.data;
    if (
      result.data &&
      result.data.transactionId &&
      result.flag === BICONOMY_RESPONSE_CODES.SUCCESS
    ) {
      mexaSdkClientMessenger(this, {
        transactionId: result.data.transactionId,
      });
      return {
        transactionId: result.data.transactionId,
      };
    }
    if (result.flag === BICONOMY_RESPONSE_CODES.BAD_REQUEST) {
      await fallback();
      return {
        transactionId: result.data.transactionId,
      };
    }
    const error: any = {};
    error.code = result.flag || result.code;
    error.message =
      result.log || result.message || 'Error in native meta api call';
    return {
      error: error.toString(),
      transcionId: result.data.transactionId,
    };
  } catch (error) {
    logErrorMessage(error);
    if (error.response) {
      return error.response.data;
    }
    return error;
  }
}

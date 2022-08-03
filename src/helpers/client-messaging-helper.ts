/* eslint-disable consistent-return */
import { logErrorMessage, logMessage } from '../utils';
import type { Biconomy } from '..';

export const mexaSdkClientMessenger = async (
  engine: Biconomy,
  transactionData: { transactionId: string },
) => {
  try {
    const { transactionId } = transactionData;

    engine.clientMessenger.createTransactionNotifier(transactionId, {
      onMined: (tx: { transactionId: string; transactionHash: string; receipt: any }) => {
        logMessage(`Tx Hash mined message received at client with id ${tx.transactionId} and hash ${tx.transactionHash}`);
        engine.emit('txMined', {
          msg: 'txn mined',
          id: tx.transactionId,
          hash: tx.transactionHash,
          receipt: tx.receipt,
        });
      },
      onHashGenerated: (tx: { transactionId: string; transactionHash: string; }) => {
        logMessage(`Tx Hash generated message received at client ${tx.transactionId} and hash ${tx.transactionHash}`);

        engine.emit('txHashGenerated', {
          msg: 'txn hash generated',
          id: tx.transactionId,
          hash: tx.transactionHash,
        });
      },
      onError: (errorResponseData: { error: any; transactionId: string; }) => {
        logMessage(`Error message received at client\n ${errorResponseData.error}`);
        engine.emit('onError', {
          error: errorResponseData.error,
          transactionId: errorResponseData.transactionId,
        });
      },
      onHashChanged: (tx: { transactionId: string; transactionHash: string; }) => {
        logMessage(`Tx Hash changed message received at client ${tx.transactionId} and hash ${tx.transactionHash}`);

        engine.emit('txHashChanged', {
          msg: 'txn hash changed',
          id: tx.transactionId,
          hash: tx.transactionHash,
        });
      },
    });
  } catch (error) {
    logErrorMessage(error);
  }
};

/* eslint-disable import/no-cycle */
import { Biconomy } from '..';

export type GnosisWalletClientParams = {
  biconomyProvider: Biconomy,
  networkId: number,
  apiKey: string,
};

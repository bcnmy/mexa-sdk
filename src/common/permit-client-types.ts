/* eslint-disable import/no-cycle */
import { Biconomy } from '..';

export type PermitClientParams = {
  biconomyProvider: Biconomy,
  erc20ForwarderAddress: string,
  daiTokenAddress: string,
  networkId: number,
};

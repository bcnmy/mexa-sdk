import { ethers } from 'ethers';
import axios from 'axios';
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk'
import SafeServiceClient from "@gnosis.pm/safe-service-client";
import { GnosisWalletClientParams } from './common/gnosis-wallet-client-types';
import {
  config,
} from './config';

export class GnosisWalletClient {
  biconomyProvider;

  apiKey;

  networkId;

  constructor(gnosisClientParameters: GnosisWalletClientParams) {
    const {
      biconomyProvider,
      networkId,
      apiKey,
    } = gnosisClientParameters;

    this.biconomyProvider = biconomyProvider;
    this.networkId = networkId;
    this.apiKey = apiKey;
  }

  async createNewGnosisSafe() {

  }

  async connectToGnosisSafe() {

  }

  async buildSafeTransaction() {

  }

  async executeSafeTransaction() {

  }

  async executeMultiSendSafeTransaction() {

  }

  async whitelistTargetContract(authToken: string, contractAddresses: Array<string>) {
    await axios.post(
      `${config.metaEntryPointBaseUrl}/api/v1/sdk/dapp/gnosis/whitelist-target`,
      {
        contractAddresses,
      },
      {
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          authToken,
          apiKey: this.apiKey,
          version: config.PACKAGE_VERSION,
        },
      },
    );
  }

}
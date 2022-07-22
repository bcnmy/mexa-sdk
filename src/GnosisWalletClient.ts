import { ethers } from 'ethers';
import axios from 'axios';
import EthersAdapter from '@gnosis.pm/safe-ethers-lib';
import Web3Adapter from '@gnosis.pm/safe-web3-lib'
import Web3 from 'web3'
import Safe, { SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk';
import { GnosisWalletClientParams } from './common/gnosis-wallet-client-types';
import { SafeTransaction } from '@gnosis.pm/safe-core-sdk-types';
import {
  config,
} from './config';

export class GnosisWalletClient {
  biconomyProvider;

  apiKey;

  networkId;
  
  ethAdapter?: EthersAdapter | Web3Adapter;

  safeFactory?: SafeFactory;

  safeSdk?: Safe;

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

  async setEthersAdapter (userAddress: string, rpcUrl?: string) {
    if(rpcUrl) {
      const web3 = new Web3.providers.HttpProvider(rpcUrl);
      this.ethAdapter = new Web3Adapter({
        web3,
        signerAddress: userAddress
      });
      return true;
    } else {
      this.ethAdapter = new EthersAdapter({
        ethers,
        signer: this.biconomyProvider.getSignerByAddress(userAddress)
      });
      return true;
    }
    
  }


  async createNewGnosisSafe(safeAccountConfig: SafeAccountConfig) {
    if(this.ethAdapter) {
      this.safeFactory = await SafeFactory.create({ ethAdapter: this.ethAdapter });
      this.safeSdk = await this.safeFactory.deploySafe({ safeAccountConfig });
      return this.safeSdk;
    } else {
      throw new Error("No adapter set. Please set ethers adapter using setEthersAdapter()");
    }
  }

  async connectToGnosisSafe(safeAddress: string) {
    if(this.ethAdapter) {
      this.safeSdk = await Safe.create({ethAdapter: this.ethAdapter, safeAddress});
      return this.safeSdk;
    } else {
      throw new Error("No adapter set. Please set ethers adapter using setEthersAdapter()");
    }
  }

  async executeSafeTransaction(safeTransaction: SafeTransaction, gasLimit: number) {
    if(this.ethAdapter && this.safeSdk) {
      const safeTransactionResponse = await this.safeSdk.executeTransaction(safeTransaction, {gasLimit}); 
      return safeTransactionResponse;
    } else {
      throw new Error("Please set up ethAdapter and safeSdk before executing safe transaction.");
    }
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
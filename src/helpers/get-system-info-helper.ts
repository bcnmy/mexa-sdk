/* eslint-disable consistent-return */
import { ethers } from 'ethers';
import axios from 'axios';
import {
  config,
} from '../config';
import { logErrorMessage, logMessage } from '../utils';

import { biconomyForwarderAbi } from '../abis';
import type { Biconomy } from '..';
import { ContractMetaTransactionType, SystemInfoResponse } from '../common/types';

const domainData = {
  name: config.eip712DomainName,
  version: config.eip712SigVersion,
  verifyingContract: config.eip712VerifyingContract,
  chainId: 0,
};

export async function getSystemInfo(
  this: Biconomy,
  providerNetworkId: number,
) {
  try {
    domainData.chainId = providerNetworkId;
    logMessage('Making system info call to get contract addresses');
    const response: SystemInfoResponse = await axios.get(
      `${config.metaEntryPointBaseUrl}/api/v1/systemInfo/?networkId=${providerNetworkId}`,
      {
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          version: config.PACKAGE_VERSION,
        },
      },
    );
    const systemInfoResponse = response.data.response;
    if (systemInfoResponse.code === '200' && systemInfoResponse.data) {
      const systemInfo = systemInfoResponse.data;
      this.forwarderDomainType = systemInfo.forwarderDomainType;
      this.defaultMetaTransaction = ContractMetaTransactionType.DEFAULT;
      this.trustedForwarderMetaTransaction = ContractMetaTransactionType.EIP2771;
      this.forwardRequestType = systemInfo.forwardRequestType;
      this.forwarderDomainData = systemInfo.forwarderDomainData;
      this.forwarderDomainDetails = systemInfo.forwarderDomainDetails;
      this.forwarderAddress = systemInfo.biconomyForwarderAddress;
      this.forwarderAddresses = systemInfo.biconomyForwarderAddresses;
      this.eip712Sign = systemInfo.eip712Sign;
      this.personalSign = systemInfo.personalSign;
      this.walletFactoryAddress = systemInfo.walletFactoryAddress;
      this.baseWalletAddress = systemInfo.baseWalletAddress;
      this.entryPointAddress = systemInfo.entryPointAddress;
      this.handlerAddress = systemInfo.handlerAddress;
      this.gnosisSafeProxyFactoryAddress = systemInfo.gnosisSafeProxyFactoryAddress;
      this.gnosisSafeAddress = systemInfo.gnosisSafeAddress;

      if (this.forwarderAddress && this.forwarderAddress !== '') {
        this.biconomyForwarder = new ethers.Contract(
          this.forwarderAddress,
          biconomyForwarderAbi,
          this.ethersProvider,
        );
      }
    } else {
      logMessage(`System info response: ${JSON.stringify(systemInfoResponse)}`);
      throw new Error('System info API call failed');
    }
  } catch (error) {
    logErrorMessage(error);
  }
}

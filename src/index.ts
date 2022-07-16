/* eslint-disable consistent-return */
/**
 * @dev Biconomy class that is the entry point
 */
import EventEmitter from 'events';
import { ExternalProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import axios from 'axios';
import { ClientMessenger } from 'gasless-messaging-sdk';
import WebSocket from 'isomorphic-ws';
import { serializeError } from 'serialize-error';
import {
  DappApiMapType,
  ForwarderDomainData,
  ForwarderDomainType,
  ForwardRequestType,
  InterfaceMapType,
  JsonRpcCallback,
  JsonRpcRequest,
  MetaApiType,
  OptionsType,
  SmartContractMapType,
  SmartContractMetaTransactionMapType,
  SmartContractTrustedForwarderMapType,
  SmartContractType,
} from './common/types';
import {
  logErrorMessage,
  logMessage, validateOptions,
} from './utils';
import { BICONOMY_RESPONSE_CODES, config, HTTP_CODES } from './config';
import { handleSendTransaction } from './helpers/handle-send-transaction-helper';
import { sendSignedTransaction } from './helpers/send-signed-transaction-helper';
import { getSystemInfo } from './helpers/get-system-info-helper';
import {
  getSignatureEIP712, getSignaturePersonal,
} from './helpers/signature-helpers';
import { sendTransaction } from './helpers/send-transaction-helper';
import { buildSignatureCustomEIP712MetaTransaction, buildSignatureCustomPersonalSignMetaTransaction } from './helpers/meta-transaction-custom-helpers';

export class Biconomy extends EventEmitter {
  apiKey: string;

  private externalProvider: ExternalProvider;

  readOnlyProvider?: ethers.providers.JsonRpcProvider;

  provider: ExternalProvider;

  dappApiMap: DappApiMapType = {};

  interfaceMap: InterfaceMapType = {};

  smartContractMap: SmartContractMapType = {};

  smartContractMetaTransactionMap: SmartContractMetaTransactionMapType = {};

  smartContractTrustedForwarderMap: SmartContractTrustedForwarderMapType = {};

  strictMode = false;

  signer?: ethers.providers.JsonRpcSigner;

  forwarderDomainType?: ForwarderDomainType;

  defaultMetaTransaction?: string;

  trustedForwarderMetaTransaction?: string;

  forwardRequestType?: ForwardRequestType;

  forwarderDomainData?: ForwarderDomainData;

  forwarderDomainDetails?: Array<ForwarderDomainData>;

  eip712Sign?: string;

  personalSign?: string;

  biconomyForwarder?: ethers.Contract;

  forwarderAddresses?: string[];

  forwarderAddress?: string;

  walletFactoryAddress?: string;

  baseWalletAddress?: string;

  entryPointAddress?: string;

  handlerAddress?: string;

  gnosisSafeProxyFactoryAddress?: string;

  gnosisSafeAddress?: string;

  ethersProvider: ethers.providers.Web3Provider;

  networkId?: number;

  dappId?: string;

  getSystemInfo = getSystemInfo;

  handleSendTransaction = handleSendTransaction;

  sendTransaction = sendTransaction;

  sendSignedTransaction = sendSignedTransaction;

  getSignatureEIP712 = getSignatureEIP712;

  getSignaturePersonal = getSignaturePersonal;

  contractAddresses?: string[];

  buildSignatureCustomEIP712MetaTransaction = buildSignatureCustomEIP712MetaTransaction;

  buildSignatureCustomPersonalSignMetaTransaction = buildSignatureCustomPersonalSignMetaTransaction;

  clientMessenger: any;

  /**
   * constructor would initiliase providers and set values passed in options
   * strictMode true would return error, strictMode false would fallback to default provider
   * externalProvider is the provider dev passes (ex. window.ethereum)
   * this.provider is the proxy provider object that would intercept all rpc calls for the SDK
   */
  constructor(provider: ExternalProvider, options: OptionsType) {
    super();
    validateOptions(options);
    this.apiKey = options.apiKey;
    this.strictMode = options.strictMode || false;
    this.externalProvider = provider;
    this.provider = this.proxyFactory();
    this.contractAddresses = options.contractAddresses;
    this.ethersProvider = new ethers.providers.Web3Provider(provider);
    this.clientMessenger = new ClientMessenger(
      config.webSocketConnectionUrl,
      WebSocket,
    );

    if (options.jsonRpcUrl) {
      this.readOnlyProvider = new ethers.providers.JsonRpcProvider(options.jsonRpcUrl);
    }
  }

  private proxyFactory() {
    return new Proxy(this.externalProvider, this.proxyProvider);
  }

  proxyProvider = {
    // Difference between send and request
    get: (target: ExternalProvider, prop: string, ...args: any[]) => {
      switch (prop) {
        case 'send':
          return this.handleRpcSend.bind(this);
        case 'sendAsync':
          return this.handleRpcSendAsync.bind(this);
        case 'request':
          return this.handleRpcRequest.bind(this);
        default:
          break;
      }
      return Reflect.get(target, prop, ...args);
    },
  };

  async handleRpcSendType1(payload: JsonRpcRequest, callback: JsonRpcCallback) {
    const fallback = () => this.externalProvider.send?.(payload, callback);
    const { method, params } = payload;
    try {
      switch (method) {
        case 'eth_sendTransaction':
          return await this.handleSendTransaction({ params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ params, fallback });
        default:
          return fallback();
      }
    } catch (e) {
      return fallback();
    }
  }

  async handleRpcSendType2(method: string, params?: Array<unknown>) {
    // @ts-ignore
    const fallback = () => this.externalProvider.send?.(method, params);
    try {
      switch (method) {
        case 'eth_sendTransaction':
          return await this.handleSendTransaction({ params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ params, fallback });
        default:
          return fallback();
      }
    } catch (e) {
      return fallback();
    }
  }

  async handleRpcSendType3(payload: JsonRpcRequest) {
    // @ts-ignore
    const fallback = () => this.externalProvider.send?.(payload);
    const { method, params } = payload;
    try {
      switch (method) {
        case 'eth_sendTransaction':
          return await this.handleSendTransaction({ params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ params, fallback });
        default:
          return fallback();
      }
    } catch (e) {
      return fallback();
    }
  }

  handleRpcSend(...args: any[]) {
    // provider.send is deprecated, but it is still commonly used, so we need to handle it
    // it has three signatures, and we need to support all of them.

    // ethereum.send(
    //   methodOrPayload: string | JsonRpcRequest,
    //   paramsOrCallback: Array<unknown> | JsonRpcCallback,
    // ): Promise<JsonRpcResponse> | void;

    // Type 1:
    // ethereum.send(payload: JsonRpcRequest, callback: JsonRpcCallback): void;

    // Type 2:
    // ethereum.send(method: string, params?: Array<unknown>): Promise<JsonRpcResponse>;

    // Type 3:
    // ethereum.send(payload: JsonRpcRequest): unknown;

    if (typeof args[0] === 'string') {
      // this is type 2
      return this.handleRpcSendType2(args[0] as string, args[1] as Array<unknown>);
    }

    if (!args[1]) {
      // this is type 3
      return this.handleRpcSendType3(args[0] as JsonRpcRequest);
    }

    // this is type 1
    return this.handleRpcSendType1(args[0] as JsonRpcRequest, args[1] as JsonRpcCallback);
  }

  async handleRpcSendAsync(payload: JsonRpcRequest, callback: JsonRpcCallback) {
    const fallback = () => this.externalProvider.sendAsync?.(payload, callback);

    const { method, params } = payload;
    try {
      switch (method) {
        case 'eth_sendTransaction':
          return await this.handleSendTransaction({ params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ params, fallback });
        default:
          return fallback();
      }
    } catch (e) {
      logMessage(`Request failed with error: ${JSON.stringify(e)}. Falling back to default provider`);
      return fallback();
    }
  }

  async handleRpcRequest({ method, params } : { method: string, params: string[] }) {
    const fallback = () => this.externalProvider.request?.({ method, params });

    try {
      switch (method) {
        case 'eth_sendTransaction':
          return await this.handleSendTransaction({ params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ params, fallback });
        default:
          return await fallback();
      }
    } catch (e) {
      logMessage(`Request failed with error: ${JSON.stringify(e)}. Falling back to default provider`);
      return fallback();
    }
  }

  /**
   * Function to initialize the biconomy object with DApp information.
   * It fetches the dapp's smart contract from biconomy database
   * and initialize the decoders for each smart
   * contract which will be used to decode information during function calls.
   * */
  async init() {
    try {
      this.signer = this.ethersProvider.getSigner();
      await this.getDappData();
      try {
        if (!this.clientMessenger.socketClient.isConnected()) {
          await this.clientMessenger.connect();
        }
      } catch (error) {
        logMessage(`Error while connecting to socket server ${JSON.stringify(error)}`);
      }
      const providerNetworkId = (await this.ethersProvider.getNetwork()).chainId;

      if (providerNetworkId) {
        if (providerNetworkId !== this.networkId) {
          throw new Error(`Current networkId ${providerNetworkId} is different from dapp network id registered on mexa dashboard ${this.networkId}`);
        }
        await this.getSystemInfo(providerNetworkId);
      } else {
        throw new Error('Could not get network version');
      }
    } catch (error) {
      logMessage(error);
      return error;
    }
  }

  async getDappData() {
    try {
      const response = await axios.get(
        `${config.metaEntryPointBaseUrl}/api/v1/sdk/dapp/`,
        {
          params: {
            contractAddresses: this.contractAddresses,
          },
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json;charset=utf-8',
            version: config.PACKAGE_VERSION,
          },
        },
      );
      const { data } = response.data;
      const { dapp, smartContracts, metaApis } = data;

      this.networkId = parseInt(dapp.networkId, 10);
      this.dappId = dapp._id;

      if (smartContracts && smartContracts.length > 0) {
        smartContracts.forEach((contract: SmartContractType) => {
          const contractInterface = new ethers.utils.Interface(JSON.parse(contract.abi.toString()));
          this.smartContractMetaTransactionMap[
            contract.address.toLowerCase()
          ] = contract.metaTransactionType;
          this.interfaceMap[
            contract.address.toLowerCase()
          ] = contractInterface;
          this.smartContractMap[
            contract.address.toLowerCase()
          ] = contract.abi.toString();
        });
      }
      if (metaApis && metaApis.length > 0) {
        metaApis.forEach((metaApi: MetaApiType) => {
          const { contractAddress, method } = metaApi;
          this.dappApiMap[`${contractAddress.toLowerCase()}-${method}`] = metaApi;
        });
      }
    } catch (error) {
      logErrorMessage(error);
      throw error;
    }
  }

  async getTransactionStatus(transactionId: string) {
    try {
      const response = await axios.get(
        `${config.metaEntryPointBaseUrl}/api/v1/sdk/transaction-status`,
        {
          params: {
            transactionId,
          },
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json;charset=utf-8',
            version: config.PACKAGE_VERSION,
          },
        },
      );
      const { data } = response.data;
      return {
        flag: BICONOMY_RESPONSE_CODES.SUCCESS,
        ...data,
      };
    } catch (error) {
      logErrorMessage(error);
      return {
        flag: BICONOMY_RESPONSE_CODES.ERROR_RESPONSE,
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
        error: serializeError(error),
      };
    }
  }
}

// import txDecoder from 'ethereum-tx-decoder';
import { ethers } from 'ethers';
import { eip2771BaseAbi } from '../abis';
import { config } from '../config';
import { logMessage } from '../utils';
import { FindRightForwarderParamsType } from '../common/types';

export const findTheRightForwarder = async (
  findTheRightForwarderParams: FindRightForwarderParamsType,
) => {
  const {
    to,
    smartContractTrustedForwarderMap,
    provider,
    forwarderAddresses,
    forwarderAddress,
  } = findTheRightForwarderParams;
  let forwarderToUse;
  if (smartContractTrustedForwarderMap[to]) {
    forwarderToUse = smartContractTrustedForwarderMap[to];
  } else {
    const contract = new ethers.Contract(to, eip2771BaseAbi, provider);
    const supportedForwarders = forwarderAddresses;
    forwarderToUse = forwarderAddress; // default forwarder

    // Attempt to find out forwarder that 'to' contract trusts
    let forwarder;
    try {
      forwarder = await contract.trustedForwarder();
    } catch (error) {
      logMessage("Could not find read method 'trustedForwarder' in the contract abi");
      logMessage(JSON.stringify(error));
    }

    for (let i = 0; i < supportedForwarders.length; i += 1) {
      // Check if it matches above forwarder
      if (forwarder) {
        if (supportedForwarders[i].toString() === forwarder.toString()) {
          forwarderToUse = supportedForwarders[i];
          break;
        }
      }
      // Another way to find out is isTrustedForwarder read method
      try {
        // eslint-disable-next-line no-await-in-loop
        const isTrustedForwarder = await contract.isTrustedForwarder(supportedForwarders[i]);
        if (isTrustedForwarder) {
          forwarderToUse = supportedForwarders[i];
          break;
        }
      } catch (error) {
        logMessage("Could not find read method 'isTrustedForwarder' in the contract abi");
        logMessage(JSON.stringify(error));
      }
    }
  }
  return forwarderToUse;
};

export const buildForwardTxRequest = async (
  account: string,
  to: string,
  gasLimitNum: number,
  data: any,
  biconomyForwarder: ethers.Contract,
  batchId = 0,
) => {
  if (!biconomyForwarder) {
    throw new Error('Biconomy Forwarder is not defined for current network');
  }
  const batchNonce = await biconomyForwarder.getNonce(account, batchId);
  const req = {
    from: account,
    to,
    token: config.ZERO_ADDRESS,
    txGas: gasLimitNum,
    tokenGasPrice: '0',
    batchId,
    batchNonce: parseInt(batchNonce, 10),
    deadline: Math.floor(Date.now() / 1000 + 3600),
    data,
  };
  return { request: req };
};

export const getDomainSeperator = (biconomyForwarderDomainData: any) => {
  const domainSeparator = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode([
    'bytes32',
    'bytes32',
    'bytes32',
    'address',
    'bytes32',
  ], [
    ethers.utils.id('EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)'),
    ethers.utils.id(biconomyForwarderDomainData.name),
    ethers.utils.id(biconomyForwarderDomainData.version),
    biconomyForwarderDomainData.verifyingContract,
    biconomyForwarderDomainData.salt,
  ]));
  return domainSeparator;
};

// TODO discuss if we are to expose
/* export async function getForwardRequestAndMessageToSign(
  this: Biconomy,
  rawTransaction,
  customBatchId,
  customDomainName,
  customDomainVersion,
) {
  try {
    if (!this.interfaceMap) {
      return {
        error: 'Interface Map is undefined',
        code: RESPONSE_CODES.INTERFACE_MAP_UNDEFINED,
      };
    }

//     if (!this.dappApiMap) {
//       return {
//         error: 'Dapp Api Map is undefined',
//         code: RESPONSE_CODES.DAPP_API_MAP_UNDEFINED,
//       };
//     }

//     if (!this.smartContractMetaTransactionMap) {
//       return {
//         error: 'Smart contract meta transaction map is undefined',
//         code: RESPONSE_CODES.SMART_CONTRACT_METATRANSACTION_MAP_UNDEFINED,
//       };
//     }

//     if (!this.smartContractTrustedForwarderMap) {
//       return {
//         error: 'Smart contract trusted forwarder map is undefined',
//         code: RESPONSE_CODES.SMART_CONTRACT_TRSUTED_FORWARDER_MAP_UNDEFINED,
//       };
//     }

//     if (!this.smartContractMap) {
//       return {
//         error: 'Smart contract map is undefined',
//         code: RESPONSE_CODES.SMART_CONTRACT_MAP_UNDEFINED,
//       };
//     }

//     if (!this.forwarderDomainData) {
//       return {
//         error: 'Forwarder domain data is undefined',
//         code: RESPONSE_CODES.FORWARDER_DOMAIN_DATA_UNDEFINED,
//       };
//     }

//     if (!this.forwarderDomainDetails) {
//       return {
//         error: 'Forwarder domain details is undefined',
//         code: RESPONSE_CODES.FORWARDER_DOMAIN_DETAILS_UNDEFINED,
//       };
//     }

//     if (!this.biconomyForwarder) {
//       return {
//         error: 'Biconomy forwarder contract is undefined',
//         code: RESPONSE_CODES.BICONOMY_FORWARDER_UNDEFINED,
//       };
//     }

//     if (!this.forwarderAddresses) {
//       return {
//         error: 'Forwarder Addresses array is undefined',
//         code: RESPONSE_CODES.FORWARDER_ADDRESSES_ARRAY_UNDEFINED,
//       };
//     }

//     if (!this.forwarderAddress) {
//       return {
//         error: 'Forwarder Address is undefined',
//         code: RESPONSE_CODES.FORWARDER_ADDRESS_UNDEFINED,
//       };
//     }

        let request; let cost; let
          forwarderToUse;
        if (metaTxApproach === this.trustedForwarderMetaTransaction) {
          forwarderToUse = await findTheRightForwarder({
            to,
            smartContractTrustedForwarderMap: this.smartContractTrustedForwarderMap,
            ethersProvider: this.ethersProvider,
            forwarderAddresses: this.forwarderAddresses,
            forwarderAddress: this.forwarderAddress,
          });

          // Attach the forwarder with right address

          request = (
            await buildForwardTxRequest(
              account,
              to,
              gasLimitNum,
              decodedTx.data,
              this.biconomyForwarder.attach(forwarderToUse),
              customBatchId,
            )
          ).request;
        } else {
          const error = formatMessage(
            RESPONSE_CODES.INVALID_OPERATION,
            'Smart contract is not registered
             in the dashboard for this meta transaction approach.
             Kindly use biconomy.getUserMessageToSign',
          );
          return error;
        }

//         const methodName = methodInfo.name;

//         const api = this.dappApiMap[to][methodName];

//         const contractAddress = api.contractAddress.toLowerCase();
//         const metaTxApproach = this.smartContractMetaTransactionMap[contractAddress];

        const eip712DataToSign = {
          types: {
            EIP712Domain: this.forwarderDomainType,
            ERC20ForwardRequest: this.forwardRequestType,
          },
          domain: domainDataToUse,
          primaryType: 'ERC20ForwardRequest',
          message: request,
        };

        const hashToSign = abi.soliditySHA3(
          [
            'address',
            'address',
            'address',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'bytes32',
          ],
          [
            request.from,
            request.to,
            request.token,
            request.txGas,
            request.tokenGasPrice,
            request.batchId,
            request.batchNonce,
            request.deadline,
            ethers.utils.keccak256(request.data),
          ],
        );

        const dataToSign = {
          eip712Format: eip712DataToSign,
          personalSignatureFormat: hashToSign,
          request,
          cost,
        };
        return dataToSign;
      }
      const error = formatMessage(
        RESPONSE_CODES.BICONOMY_NOT_INITIALIZED,
        'Decoders not initialized properly in mexa sdk.
         Make sure your have smart contracts registered on Mexa Dashboard',
      );
      return error;
    }
  } catch (error) {
    throw new Error(`Something went wrong in
    getForwardRequestAndMessageToSign(). Error message: ${JSON.stringify(error)}`);
  }
} */

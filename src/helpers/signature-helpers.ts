import { ethers } from 'ethers';
import abi from 'ethereumjs-abi';
import { toBuffer, ToBufferInputTypes } from 'ethereumjs-util';
import type { Biconomy } from '..';
import { ForwarderDomainData, ForwarderDomainType, ForwardRequestType } from '../common/types';
import { RESPONSE_CODES } from '../config';
import { logMessage } from '../utils';
/**
 * Method to get the signature parameters.
 * @param signature String representing a signature
 * */
export const getSignatureParameters = (signature: string) => {
  if (!ethers.utils.isHexString(signature)) {
    throw new Error(
      'Given value "'.concat(signature, '" is not a valid hex string.'),
    );
  }
  const r = signature.slice(0, 66);
  const s = '0x'.concat(signature.slice(66, 130));
  let v: string | number = '0x'.concat(signature.slice(130, 132));
  v = ethers.BigNumber.from(v).toNumber();
  if (![27, 28].includes(v)) v += 27;
  return {
    r,
    s,
    v,
  };
};

export async function getEIP712ForwardMessageToSign(
  forwarderDomainDetails: ForwarderDomainData[],
  forwarderDomainType: ForwarderDomainType,
  forwardRequestType: ForwardRequestType,
  request: any,
  domainData: any,
) {
  if (
    !forwarderDomainDetails
      || Object.keys(forwarderDomainDetails).length === 0
  ) {
    throw new Error('Biconomy is not properly initialized');
  }

  // Override domainData
  const domainDataToUse = domainData;
  // Might update version as well

  const dataToSign = JSON.stringify({
    types: {
      EIP712Domain: forwarderDomainType,
      ERC20ForwardRequest: forwardRequestType,
    },
    domain: domainDataToUse,
    primaryType: 'ERC20ForwardRequest',
    message: request,
  });
  return dataToSign;
}

// take parameter for chosen signature type V3 or V4
export async function getSignatureEIP712(
  this: Biconomy,
  account: string,
  request: any,
  domainData: any,
  type: string,
) {
  if (!this.forwarderDomainDetails) {
    return {
      error: 'Forwarder domain details is undefined',
      code: RESPONSE_CODES.FORWARDER_DOMAIN_DETAILS_UNDEFINED,
    };
  }

  if (!this.forwarderDomainType) {
    return {
      error: 'Forwarder domain type is undefined',
      code: RESPONSE_CODES.FORWARDER_DOMAIN_TYPE_UNDEFINED,
    };
  }

  if (!this.forwardRequestType) {
    return {
      error: 'Forwarder request type is undefined',
      code: RESPONSE_CODES.FORWARDER_REQUEST_TYPE_UNDEFINED,
    };
  }

  // default V4 now
  let signTypedDataType = 'eth_signTypedData_v4';
  if (type === 'v3' || type === 'V3') {
    signTypedDataType = 'eth_signTypedData_v3';
  }
  const dataToSign = await getEIP712ForwardMessageToSign(
    this.forwarderDomainDetails,
    this.forwarderDomainType,
    this.forwardRequestType,
    request,
    domainData,
  );

  const { ethersProvider } = this;
  try {
    const signature = await ethersProvider.send(signTypedDataType, [
      account,
      dataToSign,
    ]);
    const { r, s, v } = getSignatureParameters(signature);
    const vNum = ethers.BigNumber.from(v).toHexString();
    const newSignature = r + s.slice(2) + vNum.slice(2);
    return newSignature;
  } catch (error) {
    logMessage('error inside signature');
    logMessage(error);
    return '';
  }
}

export function getPersonalForwardMessageToSign(request:
{
  from: string;
  to: string;
  token: string;
  txGas: number;
  tokenGasPrice: number;
  batchId: number;
  batchNonce: number;
  deadline: number;
  data: ethers.utils.BytesLike;
}) {
  return abi.soliditySHA3(
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
}

export function getPersonalCustomMessageToSign(request:
{
  nonce: number;
  contractAddress: string;
  chainId: number;
  functionSignature: ToBufferInputTypes;
}) {
  return abi.soliditySHA3(
    ['uint256', 'address', 'uint256', 'bytes'],
    [request.nonce, request.contractAddress, request.chainId, toBuffer(request.functionSignature)],
  );
}

/**
 * Method to get the signature parameters.
 * @param engine Object containing the signer, walletprovider and originalprovider
 * @param request Object containing the request parameters
 * */
export async function getSignaturePersonal(this: Biconomy, request: any) {
  const hashToSign = getPersonalForwardMessageToSign(request);
  let signature;

  // eslint-disable-next-line no-async-promise-executor
  const promise = new Promise(async (resolve, reject) => {
    try {
      if (!this.signer) {
        throw new Error('Signer not found');
      }
      signature = await this.signer.signMessage(ethers.utils.arrayify(hashToSign));
      const { r, s, v } = getSignatureParameters(signature);
      const vNum = ethers.BigNumber.from(v).toHexString();
      const newSignature = r + s.slice(2) + vNum.slice(2);
      resolve(newSignature);
    } catch (error) {
      reject(error);
    }
  });
  return promise;
}

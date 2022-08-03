import type { Biconomy } from '..';
import { DomainDataType, SignatureParametersPerContractAddressType } from '../common/types';
import { domainType, metaTransactionType } from '../config';
import { getSignatureParameters, getPersonalCustomMessageToSign } from './signature-helpers';

export async function buildSignatureCustomEIP712MetaTransaction(
  this: Biconomy,
  userAddress: string,
  nonce: number,
  functionSignature: string,
  domainData: DomainDataType,
) {
  const message = {
    userAddress,
    nonce,
    functionSignature,
  };
  const dataToSign = JSON.stringify({
    types: {
      EIP712Domain: domainType,
      MetaTransaction: metaTransactionType,
    },
    domain: domainData,
    primaryType: 'MetaTransaction',
    message,
  });

  // Review provider
  const signature = await this.ethersProvider.send('eth_signTypedData_v4', [
    userAddress,
    dataToSign,
  ]);
  return getSignatureParameters(signature);
}

export async function buildSignatureCustomPersonalSignMetaTransaction(
  this: Biconomy,
  nonce: number,
  functionSignature: string,
) {
  if (!this.contractAddresses) {
    throw new Error('Contract Addresses array is undefined');
  }

  const signatureParamtersPerContractAddress: SignatureParametersPerContractAddressType = {};

  this.contractAddresses.forEach(async (contractAddress: string) => {
    if (!this.networkId) {
      throw new Error('NetworkId is undefined');
    }
    if (!this.signer) {
      throw new Error('Signer not found');
    }
    const messageToSign = getPersonalCustomMessageToSign(
      {
        nonce,
        functionSignature,
        chainId: this.networkId,
        contractAddress,
      },
    );

    const signature = await this.signer.signMessage(
      `0x${messageToSign.toString('hex')}`,
    );
    signatureParamtersPerContractAddress[contractAddress] = getSignatureParameters(signature);
  });
}

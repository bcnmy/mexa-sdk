export const biconomyForwarderAbi = [{ inputs: [{ internalType: 'address', name: '_owner', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' }, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32',
  }, {
    indexed: false, internalType: 'bytes', name: 'domainValue', type: 'bytes',
  }],
  name: 'DomainRegistered',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'previousOwner', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'newOwner', type: 'address',
  }],
  name: 'OwnershipTransferred',
  type: 'event',
}, {
  inputs: [], name: 'EIP712_DOMAIN_TYPE', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'REQUEST_TYPEHASH', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], name: 'domains', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executeEIP712',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executePersonalSign',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }], name: 'getNonce', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'isOwner', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'string', name: 'name', type: 'string' }, { internalType: 'string', name: 'version', type: 'string' }], name: 'registerDomainSeparator', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'verifyEIP712',
  outputs: [],
  stateMutability: 'view',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'verifyPersonalSign',
  outputs: [],
  stateMutability: 'view',
  type: 'function',
}];
export const eip2771BaseAbi = [{
  inputs: [{ internalType: 'address', name: 'forwarder', type: 'address' }], name: 'isTrustedForwarder', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'trustedForwarder', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}];

export const baseWalletAbi = [{
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'handler', type: 'address',
  }],
  name: 'ChangedFallbackHandler',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'module', type: 'address',
  }],
  name: 'DisabledModule',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: '_scw', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: '_oldEOA', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: '_newEOA', type: 'address',
  }],
  name: 'EOAChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'module', type: 'address',
  }],
  name: 'EnabledModule',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'oldEntryPoint', type: 'address',
  }, {
    indexed: false, internalType: 'address', name: 'newEntryPoint', type: 'address',
  }],
  name: 'EntryPointChanged',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'bytes32', name: 'txHash', type: 'bytes32',
  }, {
    indexed: false, internalType: 'uint256', name: 'payment', type: 'uint256',
  }],
  name: 'ExecutionFailure',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'module', type: 'address',
  }],
  name: 'ExecutionFromModuleFailure',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'module', type: 'address',
  }],
  name: 'ExecutionFromModuleSuccess',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'bytes32', name: 'txHash', type: 'bytes32',
  }, {
    indexed: false, internalType: 'uint256', name: 'payment', type: 'uint256',
  }],
  name: 'ExecutionSuccess',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'newImplementation', type: 'address',
  }],
  name: 'ImplementationUpdated',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'uint8', name: 'version', type: 'uint8',
  }],
  name: 'Initialized',
  type: 'event',
}, { stateMutability: 'nonpayable', type: 'fallback' }, {
  inputs: [], name: 'VERSION', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'bytes32', name: 'dataHash', type: 'bytes32' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'bytes', name: 'signatures', type: 'bytes' }], name: 'checkSignatures', outputs: [], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'prevModule', type: 'address' }, { internalType: 'address', name: 'module', type: 'address' }], name: 'disableModule', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'domainSeparator', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'module', type: 'address' }], name: 'enableModule', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }, { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' }, { internalType: 'uint256', name: 'baseGas', type: 'uint256' }, { internalType: 'uint256', name: 'gasPrice', type: 'uint256' }, { internalType: 'address', name: 'gasToken', type: 'address' }, { internalType: 'address', name: 'refundReceiver', type: 'address' }, { internalType: 'uint256', name: '_nonce', type: 'uint256' }], name: 'encodeTransactionData', outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'entryPoint', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'dest', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'func', type: 'bytes' }], name: 'exec', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address[]', name: 'dest', type: 'address[]' }, { internalType: 'bytes[]', name: 'func', type: 'bytes[]' }], name: 'execBatch', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'dest', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'func', type: 'bytes' }], name: 'execFromEntryPoint', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }, { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' }, { internalType: 'uint256', name: 'baseGas', type: 'uint256' }, { internalType: 'uint256', name: 'gasPrice', type: 'uint256' }, { internalType: 'address', name: 'gasToken', type: 'address' }, { internalType: 'address payable', name: 'refundReceiver', type: 'address' }, { internalType: 'bytes', name: 'signatures', type: 'bytes' }], name: 'execTransaction', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }], stateMutability: 'payable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }], name: 'execTransactionFromModule', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }], name: 'execTransactionFromModuleReturnData', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'returnData', type: 'bytes' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'getChainId', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'start', type: 'address' }, { internalType: 'uint256', name: 'pageSize', type: 'uint256' }], name: 'getModulesPaginated', outputs: [{ internalType: 'address[]', name: 'array', type: 'address[]' }, { internalType: 'address', name: 'next', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'uint256', name: 'batchId', type: 'uint256' }], name: 'getNonce', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }, { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' }, { internalType: 'uint256', name: 'baseGas', type: 'uint256' }, { internalType: 'uint256', name: 'gasPrice', type: 'uint256' }, { internalType: 'address', name: 'gasToken', type: 'address' }, { internalType: 'address', name: 'refundReceiver', type: 'address' }, { internalType: 'uint256', name: '_nonce', type: 'uint256' }], name: 'getTransactionHash', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_owner', type: 'address' }, { internalType: 'address', name: '_entryPoint', type: 'address' }, { internalType: 'address', name: '_handler', type: 'address' }], name: 'init', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'module', type: 'address' }], name: 'isModuleEnabled', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], name: 'nonces', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'token', type: 'address' }, { internalType: 'address', name: 'dest', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'pullTokens', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'handler', type: 'address' }], name: 'setFallbackHandler', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_newOwner', type: 'address' }], name: 'setOwner', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }], name: 'supportsInterface', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address payable', name: 'dest', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'transfer', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_entryPoint', type: 'address' }], name: 'updateEntryPoint', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_implementation', type: 'address' }], name: 'updateImplementation', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGas', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'address', name: 'paymaster', type: 'address' }, { internalType: 'bytes', name: 'paymasterData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation', name: 'userOp', type: 'tuple',
  }, { internalType: 'bytes32', name: 'requestId', type: 'bytes32' }, { internalType: 'uint256', name: 'requiredPrefund', type: 'uint256' }],
  name: 'validateUserOp',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
}];
export const walletFactoryAbi = [{ inputs: [{ internalType: 'address', name: '_baseImpl', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' }, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: '_proxy', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: '_implementation', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: '_owner', type: 'address',
  }],
  name: 'WalletCreated',
  type: 'event',
}, {
  inputs: [{ internalType: 'address', name: '_owner', type: 'address' }, { internalType: 'address', name: '_entryPoint', type: 'address' }, { internalType: 'address', name: '_handler', type: 'address' }, { internalType: 'uint256', name: '_index', type: 'uint256' }], name: 'deployCounterFactualWallet', outputs: [{ internalType: 'address', name: 'proxy', type: 'address' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_owner', type: 'address' }, { internalType: 'address', name: '_entryPoint', type: 'address' }, { internalType: 'address', name: '_handler', type: 'address' }], name: 'deployWallet', outputs: [{ internalType: 'address', name: 'proxy', type: 'address' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_owner', type: 'address' }, { internalType: 'uint256', name: '_index', type: 'uint256' }], name: 'getAddressForCounterfactualWallet', outputs: [{ internalType: 'address', name: '_wallet', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'isWalletExist', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}];
export const entryPointAbi = [{
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }, { internalType: 'uint32', name: '_unstakeDelaySec', type: 'uint32' }], name: 'addStakeTo', outputs: [], stateMutability: 'payable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'depositTo', outputs: [], stateMutability: 'payable', type: 'function',
}, { inputs: [{ internalType: 'address', name: '_create2factory', type: 'address' }, { internalType: 'uint256', name: '_paymasterStake', type: 'uint256' }, { internalType: 'uint32', name: '_unstakeDelaySec', type: 'uint32' }], stateMutability: 'nonpayable', type: 'constructor' }, { inputs: [{ internalType: 'uint256', name: 'opIndex', type: 'uint256' }, { internalType: 'address', name: 'paymaster', type: 'address' }, { internalType: 'string', name: 'reason', type: 'string' }], name: 'FailedOp', type: 'error' }, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'account', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'withdrawTime', type: 'uint256',
  }],
  name: 'DepositUnstaked',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'account', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'totalDeposit', type: 'uint256',
  }, {
    indexed: false, internalType: 'uint256', name: 'unstakeDelaySec', type: 'uint256',
  }],
  name: 'Deposited',
  type: 'event',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGas', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'address', name: 'paymaster', type: 'address' }, { internalType: 'bytes', name: 'paymasterData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation', name: 'op', type: 'tuple',
  }, { internalType: 'address payable', name: 'beneficiary', type: 'address' }],
  name: 'handleOp',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGas', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'address', name: 'paymaster', type: 'address' }, { internalType: 'bytes', name: 'paymasterData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation[]', name: 'ops', type: 'tuple[]',
  }, { internalType: 'address payable', name: 'beneficiary', type: 'address' }],
  name: 'handleOps',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGas', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'address', name: 'paymaster', type: 'address' }, { internalType: 'bytes', name: 'paymasterData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation', name: 'op', type: 'tuple',
  }, {
    components: [{ internalType: 'bytes32', name: 'requestId', type: 'bytes32' }, { internalType: 'uint256', name: 'prefund', type: 'uint256' }, { internalType: 'enum EntryPoint.PaymentMode', name: 'paymentMode', type: 'uint8' }, { internalType: 'uint256', name: '_context', type: 'uint256' }, { internalType: 'uint256', name: 'preOpGas', type: 'uint256' }], internalType: 'struct EntryPoint.UserOpInfo', name: 'opInfo', type: 'tuple',
  }, { internalType: 'bytes', name: 'context', type: 'bytes' }],
  name: 'internalHandleOp',
  outputs: [{ internalType: 'uint256', name: 'actualGasCost', type: 'uint256' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGas', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'address', name: 'paymaster', type: 'address' }, { internalType: 'bytes', name: 'paymasterData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation', name: 'userOp', type: 'tuple',
  }],
  name: 'simulateValidation',
  outputs: [{ internalType: 'uint256', name: 'preOpGas', type: 'uint256' }, { internalType: 'uint256', name: 'prefund', type: 'uint256' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [], name: 'unstakeDeposit', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'bytes32', name: 'requestId', type: 'bytes32',
  }, {
    indexed: true, internalType: 'address', name: 'sender', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'paymaster', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'nonce', type: 'uint256',
  }, {
    indexed: false, internalType: 'uint256', name: 'actualGasCost', type: 'uint256',
  }, {
    indexed: false, internalType: 'uint256', name: 'actualGasPrice', type: 'uint256',
  }, {
    indexed: false, internalType: 'bool', name: 'success', type: 'bool',
  }],
  name: 'UserOperationEvent',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'bytes32', name: 'requestId', type: 'bytes32',
  }, {
    indexed: true, internalType: 'address', name: 'sender', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'nonce', type: 'uint256',
  }, {
    indexed: false, internalType: 'bytes', name: 'revertReason', type: 'bytes',
  }],
  name: 'UserOperationRevertReason',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'account', type: 'address',
  }, {
    indexed: false, internalType: 'address', name: 'withdrawAddress', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'withdrawAmount', type: 'uint256',
  }],
  name: 'Withdrawn',
  type: 'event',
}, {
  inputs: [{ internalType: 'address payable', name: 'withdrawAddress', type: 'address' }, { internalType: 'uint256', name: 'withdrawAmount', type: 'uint256' }], name: 'withdrawTo', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, { stateMutability: 'payable', type: 'receive' }, {
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'create2factory', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'deposits', outputs: [{ internalType: 'uint112', name: 'amount', type: 'uint112' }, { internalType: 'uint32', name: 'unstakeDelaySec', type: 'uint32' }, { internalType: 'uint64', name: 'withdrawTime', type: 'uint64' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
  name: 'getDepositInfo',
  outputs: [{
    components: [{ internalType: 'uint112', name: 'amount', type: 'uint112' }, { internalType: 'uint32', name: 'unstakeDelaySec', type: 'uint32' }, { internalType: 'uint64', name: 'withdrawTime', type: 'uint64' }], internalType: 'struct StakeManager.DepositInfo', name: 'info', type: 'tuple',
  }],
  stateMutability: 'view',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'sender', type: 'address' }, { internalType: 'uint256', name: 'nonce', type: 'uint256' }, { internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'bytes', name: 'callData', type: 'bytes' }, { internalType: 'uint256', name: 'callGas', type: 'uint256' }, { internalType: 'uint256', name: 'verificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'preVerificationGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxFeePerGas', type: 'uint256' }, { internalType: 'uint256', name: 'maxPriorityFeePerGas', type: 'uint256' }, { internalType: 'address', name: 'paymaster', type: 'address' }, { internalType: 'bytes', name: 'paymasterData', type: 'bytes' }, { internalType: 'bytes', name: 'signature', type: 'bytes' }], internalType: 'struct UserOperation', name: 'userOp', type: 'tuple',
  }],
  name: 'getRequestId',
  outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
  stateMutability: 'view',
  type: 'function',
}, {
  inputs: [{ internalType: 'bytes', name: 'initCode', type: 'bytes' }, { internalType: 'uint256', name: '_salt', type: 'uint256' }], name: 'getSenderAddress', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'paymaster', type: 'address' }, { internalType: 'uint256', name: 'stake', type: 'uint256' }], name: 'isPaymasterStaked', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }, { internalType: 'uint256', name: 'requiredStake', type: 'uint256' }, { internalType: 'uint256', name: 'requiredDelaySec', type: 'uint256' }], name: 'isStaked', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'paymasterStake', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'unstakeDelaySec', outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }], stateMutability: 'view', type: 'function',
}];
export const gnosisSafeAbi = [{ inputs: [], stateMutability: 'nonpayable', type: 'constructor' }, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'owner', type: 'address',
  }],
  name: 'AddedOwner',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'bytes32', name: 'approvedHash', type: 'bytes32',
  }, {
    indexed: true, internalType: 'address', name: 'owner', type: 'address',
  }],
  name: 'ApproveHash',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'handler', type: 'address',
  }],
  name: 'ChangedFallbackHandler',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'guard', type: 'address',
  }],
  name: 'ChangedGuard',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'uint256', name: 'threshold', type: 'uint256',
  }],
  name: 'ChangedThreshold',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'module', type: 'address',
  }],
  name: 'DisabledModule',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'module', type: 'address',
  }],
  name: 'EnabledModule',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'bytes32', name: 'txHash', type: 'bytes32',
  }, {
    indexed: false, internalType: 'uint256', name: 'payment', type: 'uint256',
  }],
  name: 'ExecutionFailure',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'module', type: 'address',
  }],
  name: 'ExecutionFromModuleFailure',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'module', type: 'address',
  }],
  name: 'ExecutionFromModuleSuccess',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'bytes32', name: 'txHash', type: 'bytes32',
  }, {
    indexed: false, internalType: 'uint256', name: 'payment', type: 'uint256',
  }],
  name: 'ExecutionSuccess',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'address', name: 'owner', type: 'address',
  }],
  name: 'RemovedOwner',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'sender', type: 'address',
  }, {
    indexed: false, internalType: 'uint256', name: 'value', type: 'uint256',
  }],
  name: 'SafeReceived',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'initiator', type: 'address',
  }, {
    indexed: false, internalType: 'address[]', name: 'owners', type: 'address[]',
  }, {
    indexed: false, internalType: 'uint256', name: 'threshold', type: 'uint256',
  }, {
    indexed: false, internalType: 'address', name: 'initializer', type: 'address',
  }, {
    indexed: false, internalType: 'address', name: 'fallbackHandler', type: 'address',
  }],
  name: 'SafeSetup',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'bytes32', name: 'msgHash', type: 'bytes32',
  }],
  name: 'SignMsg',
  type: 'event',
}, { stateMutability: 'nonpayable', type: 'fallback' }, {
  inputs: [], name: 'VERSION', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'uint256', name: '_threshold', type: 'uint256' }], name: 'addOwnerWithThreshold', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'bytes32', name: 'hashToApprove', type: 'bytes32' }], name: 'approveHash', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '', type: 'address' }, { internalType: 'bytes32', name: '', type: 'bytes32' }], name: 'approvedHashes', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'uint256', name: '_threshold', type: 'uint256' }], name: 'changeThreshold', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'bytes32', name: 'dataHash', type: 'bytes32' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'bytes', name: 'signatures', type: 'bytes' }, { internalType: 'uint256', name: 'requiredSignatures', type: 'uint256' }], name: 'checkNSignatures', outputs: [], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'bytes32', name: 'dataHash', type: 'bytes32' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'bytes', name: 'signatures', type: 'bytes' }], name: 'checkSignatures', outputs: [], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'prevModule', type: 'address' }, { internalType: 'address', name: 'module', type: 'address' }], name: 'disableModule', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'domainSeparator', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'module', type: 'address' }], name: 'enableModule', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }, { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' }, { internalType: 'uint256', name: 'baseGas', type: 'uint256' }, { internalType: 'uint256', name: 'gasPrice', type: 'uint256' }, { internalType: 'address', name: 'gasToken', type: 'address' }, { internalType: 'address', name: 'refundReceiver', type: 'address' }, { internalType: 'uint256', name: '_nonce', type: 'uint256' }], name: 'encodeTransactionData', outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }, { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' }, { internalType: 'uint256', name: 'baseGas', type: 'uint256' }, { internalType: 'uint256', name: 'gasPrice', type: 'uint256' }, { internalType: 'address', name: 'gasToken', type: 'address' }, { internalType: 'address payable', name: 'refundReceiver', type: 'address' }, { internalType: 'bytes', name: 'signatures', type: 'bytes' }], name: 'execTransaction', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }], stateMutability: 'payable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }], name: 'execTransactionFromModule', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }], name: 'execTransactionFromModuleReturnData', outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'returnData', type: 'bytes' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'getChainId', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'start', type: 'address' }, { internalType: 'uint256', name: 'pageSize', type: 'uint256' }], name: 'getModulesPaginated', outputs: [{ internalType: 'address[]', name: 'array', type: 'address[]' }, { internalType: 'address', name: 'next', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'getOwners', outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'uint256', name: 'offset', type: 'uint256' }, { internalType: 'uint256', name: 'length', type: 'uint256' }], name: 'getStorageAt', outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'getThreshold', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }, { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' }, { internalType: 'uint256', name: 'baseGas', type: 'uint256' }, { internalType: 'uint256', name: 'gasPrice', type: 'uint256' }, { internalType: 'address', name: 'gasToken', type: 'address' }, { internalType: 'address', name: 'refundReceiver', type: 'address' }, { internalType: 'uint256', name: '_nonce', type: 'uint256' }], name: 'getTransactionHash', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'module', type: 'address' }], name: 'isModuleEnabled', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'owner', type: 'address' }], name: 'isOwner', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'nonce', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'prevOwner', type: 'address' }, { internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'uint256', name: '_threshold', type: 'uint256' }], name: 'removeOwner', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'uint256', name: 'value', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' }], name: 'requiredTxGas', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'handler', type: 'address' }], name: 'setFallbackHandler', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'guard', type: 'address' }], name: 'setGuard', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address[]', name: '_owners', type: 'address[]' }, { internalType: 'uint256', name: '_threshold', type: 'uint256' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'bytes', name: 'data', type: 'bytes' }, { internalType: 'address', name: 'fallbackHandler', type: 'address' }, { internalType: 'address', name: 'paymentToken', type: 'address' }, { internalType: 'uint256', name: 'payment', type: 'uint256' }, { internalType: 'address payable', name: 'paymentReceiver', type: 'address' }], name: 'setup', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], name: 'signedMessages', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'targetContract', type: 'address' }, { internalType: 'bytes', name: 'calldataPayload', type: 'bytes' }], name: 'simulateAndRevert', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'prevOwner', type: 'address' }, { internalType: 'address', name: 'oldOwner', type: 'address' }, { internalType: 'address', name: 'newOwner', type: 'address' }], name: 'swapOwner', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, { stateMutability: 'payable', type: 'receive' }];
export const gnosisSafeProxyFactoryAbi = [{
  anonymous: false,
  inputs: [{
    indexed: false, internalType: 'contract GnosisSafeProxy', name: 'proxy', type: 'address',
  }, {
    indexed: false, internalType: 'address', name: 'singleton', type: 'address',
  }],
  name: 'ProxyCreation',
  type: 'event',
}, {
  inputs: [{ internalType: 'address', name: '_singleton', type: 'address' }, { internalType: 'bytes', name: 'initializer', type: 'bytes' }, { internalType: 'uint256', name: 'saltNonce', type: 'uint256' }], name: 'calculateCreateProxyWithNonceAddress', outputs: [{ internalType: 'contract GnosisSafeProxy', name: 'proxy', type: 'address' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'singleton', type: 'address' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], name: 'createProxy', outputs: [{ internalType: 'contract GnosisSafeProxy', name: 'proxy', type: 'address' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_singleton', type: 'address' }, { internalType: 'bytes', name: 'initializer', type: 'bytes' }, { internalType: 'uint256', name: 'saltNonce', type: 'uint256' }, { internalType: 'contract IProxyCreationCallback', name: 'callback', type: 'address' }], name: 'createProxyWithCallback', outputs: [{ internalType: 'contract GnosisSafeProxy', name: 'proxy', type: 'address' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: '_singleton', type: 'address' }, { internalType: 'bytes', name: 'initializer', type: 'bytes' }, { internalType: 'uint256', name: 'saltNonce', type: 'uint256' }], name: 'createProxyWithNonce', outputs: [{ internalType: 'contract GnosisSafeProxy', name: 'proxy', type: 'address' }], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'proxyCreationCode', outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }], stateMutability: 'pure', type: 'function',
}, {
  inputs: [], name: 'proxyRuntimeCode', outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }], stateMutability: 'pure', type: 'function',
}];

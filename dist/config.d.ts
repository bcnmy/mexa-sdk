export declare const config: {
    PACKAGE_VERSION: string;
    SCW: string;
    metaEntryPointBaseUrl: string;
    webSocketConnectionUrl: string;
    JSON_RPC_VERSION: string;
    eip712SigVersion: string;
    eip712DomainName: string;
    eip712VerifyingContract: string;
    DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS: string;
    DEFAULT_RELAYER_PAYMENT_AMOUNT: number;
    ZERO_ADDRESS: string;
    NONCE_BATCH_ID: number;
    EXPIRY: number;
    BASE_GAS: number;
    EIP712_WALLET_TX_TYPE: {
        WalletTx: {
            type: string;
            name: string;
        }[];
    };
    EIP712_SAFE_TX_TYPE: {
        SafeTx: {
            type: string;
            name: string;
        }[];
    };
};
export declare const EVENTS: {
    SMART_CONTRACT_DATA_READY: string;
    DAPP_API_DATA_READY: string;
    LOGIN_CONFIRMATION: string;
    BICONOMY_ERROR: string;
    HELPER_CLENTS_READY: string;
};
export declare const RESPONSE_CODES: {
    ERROR_RESPONSE: string;
    API_NOT_FOUND: string;
    USER_CONTRACT_NOT_FOUND: string;
    USER_NOT_LOGGED_IN: string;
    USER_ACCOUNT_NOT_FOUND: string;
    NETWORK_ID_MISMATCH: string;
    BICONOMY_NOT_INITIALIZED: string;
    NETWORK_ID_NOT_FOUND: string;
    SMART_CONTRACT_NOT_FOUND: string;
    DAPP_NOT_FOUND: string;
    INVALID_PAYLOAD: string;
    DASHBOARD_DATA_MISMATCH: string;
    SUCCESS_RESPONSE: string;
    USER_CONTRACT_CREATION_FAILED: string;
    EVENT_NOT_SUPPORTED: string;
    INVALID_DATA: string;
    INVALID_OPERATION: string;
    WRONG_ABI: string;
    INTERFACE_MAP_UNDEFINED: string;
    DAPP_API_MAP_UNDEFINED: string;
    SMART_CONTRACT_METATRANSACTION_MAP_UNDEFINED: string;
    SMART_CONTRACT_MAP_UNDEFINED: string;
    FORWARDER_DOMAIN_DATA_UNDEFINED: string;
    FORWARDER_DOMAIN_DETAILS_UNDEFINED: string;
    BICONOMY_FORWARDER_UNDEFINED: string;
    SMART_CONTRACT_TRSUTED_FORWARDER_MAP_UNDEFINED: string;
    DAPP_ID_UNDEFINED: string;
    FORWARDER_ADDRESSES_ARRAY_UNDEFINED: string;
    FORWARDER_ADDRESS_UNDEFINED: string;
    CONTRACT_ABI_UNDEFINED: string;
    FORWARDER_DOMAIN_TYPE_UNDEFINED: string;
    FORWARDER_REQUEST_TYPE_UNDEFINED: string;
};
export declare const BICONOMY_RESPONSE_CODES: {
    SUCCESS: number;
    ACTION_COMPLETE: number;
    USER_CONTRACT_NOT_FOUND: number;
    ERROR_RESPONSE: number;
    BAD_REQUEST: number;
};
export declare const HTTP_CODES: {
    OK: number;
    INTERNAL_SERVER_ERROR: number;
    NOT_FOUND: number;
    CONFLICT: number;
    EXPECTATION_FAILED: number;
};
export declare const RESPONSE_BODY_CODES: {
    OK: number;
    DAPP_LIMIT_REACHED: number;
    USER_LIMIT_REACHED: number;
    API_LIMIT_REACHED: number;
    GAS_ESTIMATION_FAILED: number;
    INTERNAL_ERROR: number;
    NOT_FOUND: number;
};
export declare const STATUS: {
    INIT: string;
    BICONOMY_READY: string;
    NO_DATA: string;
};
export declare const domainType: {
    name: string;
    type: string;
}[];
export declare const metaTransactionType: {
    name: string;
    type: string;
}[];
//# sourceMappingURL=config.d.ts.map
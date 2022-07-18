import { OptionsType } from './common/types';
export declare const logMessage: (message: any) => void;
export declare const logErrorMessage: (errorMessage: any) => void;
export declare const getFetchOptions: (method: string, apiKey: string, data?: string) => {
    method: string;
    headers: {
        'x-api-key': string;
        'Content-Type': string;
    };
    body: string | undefined;
};
export declare const formatMessage: (code: string, message: string) => {
    code: string;
    message: string;
};
/**
 * Validate parameters passed to biconomy object. Dapp id and api key are mandatory.
 * */
export declare const validateOptions: (options: OptionsType) => void;
export declare const decodeMethod: (to: string, data: any, interfaceMap: any) => any;
//# sourceMappingURL=utils.d.ts.map
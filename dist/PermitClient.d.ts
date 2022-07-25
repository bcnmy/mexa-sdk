import { PermitClientParams } from './common/permit-client-types';
/**
 * Class to provide methods to give token transfer permissions to Biconomy's ERC20Forwarder smart contract
 * ERC20Forwarder contract is responsible to calculate gas cost in ERC20 tokens and making a transfer on user's behalf
 * For DAI token there is a special permit method provided
 * For Tokens that support EIP2612 standard (like USDC) users should use eip2612Permit
 * Check https://docs.biconomy.io to see examples of how to use permit client to give one time token approvals
 */
export declare class PermitClient {
    biconomyProvider: import(".").Biconomy;
    erc20ForwarderAddress: string;
    daiTokenAddress: string;
    daiDomainData: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: string;
    };
    networkId: number;
    constructor(permiClientParams: PermitClientParams);
    /**
     * method to provide permission to spend dai tokens to a desired spender
     * @param {object} daiPermitOptions - dai permit options contains i) spender ii) expiry iii) user address iv) allowed
     * All of the above options are optional
     * If spender is not provided by default approval will be given to ERC20 Forwarder contract on the same network as your provider
     * When your provider does not have a signer you must pass user address
     */
    daiPermit(daiPermitOptions: {
        spender: string;
        expiry: number;
        allowed: boolean;
        userAddress: string;
    }): Promise<any>;
    /**
     * method to provide permission to spend tokens that support EIP2612 Permit
     * @param {object} permitOptions - permit options contain domainData, spender, value, deadline, userAddress
     * domainData and value are manadatory options (check https://biconomy.docs.io to see a working example of this)
     * If spender is not provided by default approval will be given to ERC20 Forwarder contract on the same network as your provider
     * When your provider does not have a signer you must pass user address
     */
    eip2612Permit(permitOptions: {
        domainData?: any;
        domainType?: any;
        spender: string;
        deadline: number;
        userAddress: string;
        value?: any;
    }): Promise<any>;
}
//# sourceMappingURL=PermitClient.d.ts.map
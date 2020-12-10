import { ethers } from "ethers";
const { config } = require("./config");
const abiDecoder = require("abi-decoder");
import {
  feeProxyAbi,
  oracleAggregatorAbi,
  feeManagerAbi,
  forwarderAbi,
  transferHandlerAbi,
} from "./abis";

const domainType = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const daiPermitType = [
  { name: "holder", type: "address" },
  { name: "spender", type: "address" },
  { name: "nonce", type: "uint256" },
  { name: "expiry", type: "uint256" },
  { name: "allowed", type: "bool" },
];

const eip2612PermitType = [
  { name: "owner", type: "address" },
  { name: "spender", type: "address" },
  { name: "value", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
];

const erc20ForwardRequestType = [
  { name: "from", type: "address" },
  { name: "to", type: "address" },
  { name: "token", type: "address" },
  { name: "txGas", type: "uint256" },
  { name: "tokenGasPrice", type: "uint256" },
  { name: "batchId", type: "uint256" },
  { name: "batchNonce", type: "uint256" },
  { name: "deadline", type: "uint256" },
  { name: "dataHash", type: "bytes32" },
];

function getFetchOptions(method, apiKey) {
  return {
    method: method,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json;charset=utf-8",
    },
  };
}

// todo
// there should be a way to get networkId from the provider
// pass the networkId to get gas price
const getGasPrice = async () => {
  const apiInfo = `${config.baseURL}/api/v1/gas-price?networkId=42`;
  const response = await fetch(apiInfo);
  const responseJson = await response.json();
  console.log("Response JSON " + JSON.stringify(responseJson));
  return ethers.utils
    .parseUnits(responseJson.gasPrice.value.toString(), "gwei")
    .toString();
};

class ERC20ForwarderClient {
  //todo
  //review constructor variables
  // signer, provider and address remain fixed in client object
  constructor(
    biconomy,
    signer,
    address,
    provider,
    feeProxyAddress,
    feeProxyDomainData,
    oracleAggregatorAddress,
    feeManagerAddress,
    forwarderAddress,
    transferHandlerAddress
  ) {
    this.biconomy = biconomy;
    this.signer = signer;
    this.provider = provider;
    this.signerAddress = address;
    this.feeProxy = new ethers.Contract(feeProxyAddress, feeProxyAbi, signer);
    this.feeProxyDomainData = feeProxyDomainData;
    this.oracleAggregator = new ethers.Contract(
      oracleAggregatorAddress,
      oracleAggregatorAbi,
      signer
    );
    this.feeManager = new ethers.Contract(
      feeManagerAddress,
      feeManagerAbi,
      signer
    );
    this.forwarder = new ethers.Contract(
      forwarderAddress,
      forwarderAbi,
      signer
    );
    this.transferHandler = new ethers.Contract(
      transferHandlerAddress,
      transferHandlerAbi,
      signer
    );
  }

  /**
   * factory should use provider and BiconomyOptions
   * any additional information should go through biconomy options
   * consider adding feeProxyAddress, transferHandlerAddress, feeProxyDomainData etc as options
   */
  static async factory(
    provider,
    BiconomyOptions
  ) {
    const feeProxyDomainData = BiconomyOptions.feeProxyDomainData;
    const feeProxyAddress = BiconomyOptions.feeProxyAddress;
    const transferHandlerAddress = BiconomyOptions.transferHandlerAddress;
    const originalProvider = new ethers.providers.Web3Provider(provider);
    const signer = originalProvider.getSigner();
    const address = await signer.getAddress();
    //const signer = await biconomyProvider.getSigner();
    const feeProxy = new ethers.Contract(feeProxyAddress, feeProxyAbi, signer);
    const oracleAggregatorAddress = await feeProxy.oracleAggregator();
    const feeManagerAddress = await feeProxy.feeManager();
    const forwarderAddress = await feeProxy.forwarder();
    //biconomy object will contain apiKey data
    const dappAPIMap = {};
    const getAPIInfoAPI = `${config.baseURL}/api/${config.version}/meta-api`;

    fetch(getAPIInfoAPI, getFetchOptions("GET", BiconomyOptions.apiKey))
      .then((response) => response.json())
      .then(function (response) {
        if (response && response.listApis) {
          let apiList = response.listApis;
          for (let i = 0; i < apiList.length; i++) {
            let contractAddress = apiList[i].contractAddress;
            if (!dappAPIMap[contractAddress]) {
              dappAPIMap[contractAddress.toLowerCase()] = {};
            }
            dappAPIMap[contractAddress.toLowerCase()][apiList[i].method] =
              apiList[i];
          }
          console.log(dappAPIMap);
        }
      })
      .catch(function (error) {
        _logMessage(error);
      });

    const decoderMap = {};
    let getDAppInfoAPI = `${config.baseURL}/api/${config.version}/smart-contract`;
    fetch(getDAppInfoAPI, getFetchOptions("GET", BiconomyOptions.apiKey))
      .then((response) => response.json())
      .then(function (result) {
        if (!result && result.flag != 143) {
          return eventEmitter.emit(
            EVENTS.BICONOMY_ERROR,
            formatMessage(
              RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
              `Error getting smart contract for dappId ${dappId}`
            )
          );
        }
        let smartContractList = result.smartContracts;
        if (smartContractList && smartContractList.length > 0) {
          smartContractList.forEach((contract) => {
            abiDecoder.addABI(JSON.parse(contract.abi));
            decoderMap[contract.address.toLowerCase()] = abiDecoder;
          });
        }
      })
      .catch(function (error) {
        _logMessage(error);
      });

    const biconomy = {
      apiKey: BiconomyOptions.apiKey,
      dappAPIMap: dappAPIMap,
      decoderMap: decoderMap,
    };
    //find out ApiKey information here if possible
    return new ERC20ForwarderClient(
      biconomy,
      signer,
      address,
      originalProvider,
      feeProxyAddress,
      feeProxyDomainData,
      oracleAggregatorAddress,
      feeManagerAddress,
      forwarderAddress,
      transferHandlerAddress
    );
  }

  getApiId(req) {
    const method = this.biconomy.decoderMap[req.to.toLowerCase()].decodeMethod(
      req.data
    );
    return this.biconomy.dappAPIMap[req.to.toLowerCase()][
      method.name.toString()
    ];
  }

  async getTokenGasPrice(tokenAddress) {
    const gasPrice = ethers.BigNumber.from(await getGasPrice());
    const tokenPrice = await this.oracleAggregator.getTokenPrice(tokenAddress);
    const tokenOracleDecimals = await this.oracleAggregator.getTokenOracleDecimals(
      tokenAddress
    );
    return gasPrice
      .mul(ethers.BigNumber.from(10).pow(tokenOracleDecimals))
      .div(tokenPrice)
      .toString();
  }

  //
  async buildTx(to, token, txGas, data, newBatch = false) {
    const batchId = newBatch ? await this.forwarder.getBatch(userAddress) : 0;
    const userAddress = this.signerAddress;
    let nonce = await this.forwarder.getNonce(userAddress, batchId);
    const batchNonce = Number(nonce);
    const tokenGasPrice = await this.getTokenGasPrice(token);

    const req = {
      from: userAddress,
      to: to,
      token: token,
      txGas: txGas,
      tokenGasPrice: tokenGasPrice,
      batchId: batchId,
      batchNonce: batchNonce,
      deadline: Math.floor(Date.now() / 1000 + 3600),
      data: data,
    };

    const feeMultiplier = await this.feeManager.getFeeMultiplier(
      userAddress,
      token
    );
    const transferHandlerGas = await this.feeProxy.transferHandlerGas();
    //todo
    //verify cost calculation
    const cost =
      (req.txGas + transferHandlerGas) * req.tokenGasPrice * feeMultiplier;

    return { request: req, cost: cost };
  }

  async buildTransferTx(token, to, amount) {
    //should have call to check if user approved transferHandler

    const txCall = await this.transferHandler.populateTransaction.transfer(
      token,
      to,
      amount
    );
    return await this.buildTx(
      this.transferHandler.address,
      token,
      100000,
      txCall.data
    );
  }

  async sendTxEIP712(req) {
    //should have call to check if user approved transferHandler
    const domainSeparator = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
        [
          ethers.utils.id(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
          ),
          ethers.utils.id(this.feeProxyDomainData.name),
          ethers.utils.id(this.feeProxyDomainData.version),
          this.feeProxyDomainData.chainId,
          this.feeProxyDomainData.verifyingContract,
        ]
      )
    );

    const erc20fr = Object.assign({}, req);
    erc20fr.dataHash = ethers.utils.keccak256(erc20fr.data);
    delete erc20fr.data;
    const dataToSign = {
      types: {
        EIP712Domain: domainType,
        ERC20ForwardRequest: erc20ForwardRequestType,
      },
      domain: this.feeProxyDomainData,
      primaryType: "ERC20ForwardRequest",
      message: erc20fr,
    };

    const sig = await this.provider.send("eth_signTypedData_v4", [
      req.from,
      JSON.stringify(dataToSign),
    ]);
    const api = this.getApiId(req);
    const apiId = api.id;
    const metaTxBody = {
      to: req.to,
      from: this.signerAddress,
      apiId: apiId,
      params: [req, domainSeparator, sig],
      signatureType: "EIP712Sign",
    };
    const biconomy = await fetch(`${config.baseURL}/api/v2/meta-tx/native`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.biconomy.apiKey,
      },
      body: JSON.stringify(metaTxBody),
    });
    const responseJson = await biconomy.json();
    return responseJson["txHash"];
  }

  async sendTxPersonalSign(req) {
    const hashToSign = abi.soliditySHA3(
      [
        "address",
        "address",
        "address",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes32",
      ],
      [
        req.from,
        req.to,
        req.token,
        req.txGas,
        req.tokenGasPrice,
        req.batchId,
        req.batchNonce,
        req.deadline,
        ethers.utils.keccak256(req.data),
      ]
    );
    const sig = this.provider.signMessage(hashToSign); //verify
    const api = this.getApiId(req);
    const apiId = api.id;
    const metaTxBody = {
      to: req.to,
      from: this.signerAddress,
      apiId: apiId,
      params: [req, sig],
    };
    const biconomy = await fetch(`${config.baseURL}/api/v2/meta-tx/native`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.biconomy.apiKey,
      },
      body: JSON.stringify(metaTxBody),
    });
    const responseJson = await biconomy.json();
    return responseJson["txHash"];
  }
}

export default ERC20ForwarderClient;

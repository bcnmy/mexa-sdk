---
  Enable meta transactions or gasless transactions in your DApp by integrating
  Biconomy Gasless SDK in your DApp
---

# Biconomy Gasless SDK 

## Introduction

Biconomy Gasless SDK, enables meta transactions or gasless transactions in your DApp \(Decentralized Application\) out of the box without any change in your smart contracts and just a few lines of code in your DApp to integrate gasless sdk.

By using Gasless SDK, dapp users are able to use the dapp and send transactions free of cost while developer pays the gas fee on their behalf as a part of user acquisition cost.

### Let’s Get Started

1. Go to [Biconomy Gasless Dashboard](https://dashboard.biconomy.io/) to register your DApp and methods on which to enable meta transactions and copy your DApp ID and API Key.
2. Install Biconomy Gasless SDK 

```typescript
npm install @biconomy/mexa
```

#### Import and initialize gasless sdk and web3

```javascript
import { Biconomy } from "@biconomy/mexa";
const biconomy = new Biconomy(window.ethereum, {
        apiKey: apiKey,
        contractAddresses: [<Your contract address>],
});      
await biconomy.init();
```

#### Initialize your dapp after gasless SDK initialization

```text
biconomy.on("txMined", (data: any) => {
    // Event emitter to monitor when a transaction is mined
    console.log("transaction data", data);
});
biconomy.on("txHashGenerated", (data: any) => {
    // Event emitter to monitor when a transaction hash is generated
    console.log("transaction data", data);
});
biconomy.on("txHashChanged", (data: any) => {
    // Event emitter to monitor when a transaction hash is changed in case of gas price bump
    console.log("transaction data", data);
});
biconomy.on("error", (data: any) => {
    // Event emitter to monitor when an error occurs
    console.log("transaction data", data);
});
```

Congratulations!! You have now enabled meta transactions in your DApp. Interact with web3 the way you have been doing it.

Now whenever there is a write transaction action initiated from user \(registered in biconomy gasless dashboard also\), gasless SDK will ask for user’s signature and handle the transaction rather than sending signed transaction directly to blockchain from user’s wallet.



<table>
  <thead>
    <tr>
      <th style="text-align:left"><b>Key Name</b>
      </th>
      <th style="text-align:left"><b>Value</b>
      </th>
      <th style="text-align:left"><b>Required?</b>
      </th>
      <th style="text-align:left"><b>Description</b>
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:left">apiKey</td>
      <td style="text-align:left">
        <p>type: string</p>
        <p>API Key can be found on Biconomy gasless dashboard.</p>
      </td>
      <td style="text-align:left">true</td>
      <td style="text-align:left">Unique id assigned to each DApp that used to authenticate requests coming
        from Biconomy gasless sdk.</td>
    </tr>
    <tr>
      <td style="text-align:left">strictMode</td>
      <td style="text-align:left">
        <p>type: boolean</p>
        <p>default value: false</p>
        <p>Value could be true or false.</p>
      </td>
      <td style="text-align:left">false</td>
      <td style="text-align:left">
        <p>If strict mode is on, and method/api called by user is not registered
          on Biconomy gasless dashboard then no transaction will be initiated.</p>
        <p>If strict mode is off, and method called by user is not registered on
          Biconomy gasless dashbord dashboard then existing provider will be used to send user transaction
          but in this case, the user will have to pay the transaction fee.</p>
      </td>
    </tr>
  </tbody>
</table>

#### 



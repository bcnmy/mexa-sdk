---
  Enable meta transactions or gasless transactions in your DApp by integrating
  Mexa SDK in your DApp
---

# Biconomy SDK \(Mexa\)

## Introduction

Biconomy SDK \(Mexa\), enables meta transactions or gasless transactions in your DApp \(Decentralized Application\) out of the box without any change in your smart contracts and just a few lines of code in your DApp to integrate mexa.

By using Mexa, dapp users are able to use the dapp and send transactions free of cost while developer pays the gas fee on their behalf as a part of user acquisition cost.

### Let’s Get Started

1. Go to [Mexa Dashboard](https://dashboard.biconomy.io/) to register your DApp and methods on which to enable meta transactions and copy your DApp ID and API Key.
2. Install Biconomy SDK \(Mexa\)

```javascript
npm install @biconomy/mexa
```

#### Import and initialize mexa and web3

```javascript
import { Biconomy } from "@biconomy/mexa";
const biconomy = new Biconomy(<web3 provider>,{apiKey: <API Key>});
web3 = new Web3(biconomy);
```

**Note:** &lt;web3 provider&gt; could be window.ethereum for Metamask or portis.provider for Portis and so on.

#### Initialize your dapp after mexa initialization

```text
biconomy.onEvent(biconomy.READY, () => {
 // Initialize your dapp here
}).onEvent(biconomy.ERROR, (error, message) => {
 // Handle error while initializing mexa
});
```

Congratulations!! You have now enabled meta transactions in your DApp. Interact with web3 the way you have been doing it.

Now whenever there is a write transaction action initiated from user \(registered in mexa dashboard also\), mexa will ask for user’s signature and handle the transaction rather than sending signed transaction directly to blockchain from user’s wallet.

### Configuration

Biconomy constructor takes 2 parameters

```javascript
const biconomy = new Biconomy(<existing web3 provider>, options);
```

#### **&lt;existing web3 provider&gt;**

`object` `required`

Any web3 provider that supports `personal_sign`, `eth_accounts`, `eth_sendTransaction`, `eth_call` RPC methods and web3 subscriptions.

For example, it can be `window.ethereum` for Metamask or `portis.provider` for Portis and so on.

#### **options**

`object` `required`

A json object having configuration values for initializing mexa sdk.



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
        <p>API Key can be found on mexa dashboard.</p>
      </td>
      <td style="text-align:left">true</td>
      <td style="text-align:left">Unique id assigned to each DApp that used to authenticate requests coming
        from mexa sdk.</td>
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
          on mexa dashboard then no transaction will be initiated.</p>
        <p>If strict mode is off, and method called by user is not registered on
          mexa dashboard then existing provider will be used to send user transaction
          but in this case, the user will have to pay the transaction fee.</p>
      </td>
    </tr>
  </tbody>
</table>#### Example:

For metamask biconomy initialization code would look like:

```javascript
let options = {
 apiKey: <API KEY>,
 strictMode: true
};
const biconomy = new Biconomy(window.ethereum, options);
```

#### 




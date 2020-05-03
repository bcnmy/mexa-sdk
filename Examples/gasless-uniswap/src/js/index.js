var Web3 = require('web3')
var Biconomy = require('@biconomy/mexa')
const { config } = require('./config')
let sigUtil = require('eth-sig-util')
var web3
var contract
var erc20Contract
var biconomy
var netowrkName

const domainType = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
]

const permitType = [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
]
const domainTypeEIP2585 = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
]
const MetaTransactionType = [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'chainId', type: 'uint256' },
    { name: 'replayProtection', type: 'address' },
    { name: 'nonce', type: 'bytes' },
    { name: 'data', type: 'bytes' },
    { name: 'innerMessageHash', type: 'bytes32' },
]
const domainData = {
    name: 'Forwarder',
    version: '1',
}
let domainDataERC20 = {
    version: '1',
}
const showFaucetLink = function () {
    if (netowrkName == 'ropsten') {
        mDAILink = 'https://oneclickdapp.com/cecilia-crash/'
        MANALink = 'https://oneclickdapp.com/velvet-papa/'
    }
    if (netowrkName == 'matic') {
        mDAILink = 'https://oneclickdapp.com/alias-type/'
        MANALink = 'https://oneclickdapp.com/street-mineral/'
    }
    var a = document.createElement('a')
    a.href = mDAILink
    a.title = 'faucet'
    a.target = '_blank'
    var link = document.createTextNode('mDAI faucet')
    a.appendChild(link)

    var x = document.createElement('LABEL')
    var t = document.createTextNode(
        '  :mint yourself 10000000000000000000 to be equal to 10 (Because of decimals): This action is not gasless'
    )
    x.appendChild(t)
    var a1 = document.createElement('a')
    a1.href = MANALink
    a1.title = 'faucet'
    a1.target = '_blank'
    var link1 = document.createTextNode('MANA faucet')
    a1.appendChild(link1)
    document.body.prepend(x)
    var br = document.createElement('br')
    a1.appendChild(br)
    document.body.prepend(a)
    document.body.prepend(a1)
}
const forwarderEIP2585 = async function (_data) {
    var EIP712ForwarderContract = new web3.eth.Contract(
        config.contract.EIP712forwarderABI,
        config[netowrkName].EIP712forwarderAddress
    )
    signer = ethereum.selectedAddress
    var from = signer
    var to = config[netowrkName].routerAddress
    var value = 0
    var chainId = await web3.eth.net.getId()
    var replayProtection = config[netowrkName].EIP712forwarderAddress
    console.log(chainId)
    var batchId = 0
    var batchNonce = await EIP712ForwarderContract.methods
        .getNonce(signer, batchId)
        .call()
    var value1 = batchId * Math.pow(2, 128) + batchNonce
    var valueBn = new web3.utils.BN(value1)
    var nonce = await web3.eth.abi.encodeParameter('uint256', valueBn)
    // var decoded = await web3.eth.abi.decodeParameter("uint256", nonce);
    // console.log(decoded);
    var data = _data
    var innerMessageHash =
        '0x0000000000000000000000000000000000000000000000000000000000000000'
    var forwardMessage = {
        from: from,
        to: to,
        value: 0,
        chainId,
        replayProtection: replayProtection,
        nonce: nonce,
        data,
        innerMessageHash: innerMessageHash,
    }
    var signatureData = {
        types: {
            EIP712Domain: domainTypeEIP2585,
            MetaTransaction: MetaTransactionType,
        },
        domain: domainData,
        primaryType: 'MetaTransaction',
        message: forwardMessage,
    }
    console.log(signatureData)
    var sigString = JSON.stringify(signatureData)
    web3.providers.HttpProvider.prototype.sendAsync =
        web3.providers.HttpProvider.prototype.send

    web3.currentProvider.sendAsync(
        {
            method: 'eth_signTypedData_v4',
            params: [signer, sigString],
            from: signer,
        },
        function (err, result) {
            if (err) {
                return console.error(err)
            }

            var signatureType = {
                SignatureType: 0,
            }
            console.log(forwardMessage)
            // var signatureType = 2;
            const signature = result.result
            console.log(signature)

            let tx = EIP712ForwarderContract.methods
                .forward(forwardMessage, 0, signature)
                .send({ from: signer }, (err, res) => {
                    if (err) console.log(err)
                    else console.log(res)
                })

            tx.on('transactionHash', function (hash) {
                console.log(`Transaction hash is ${hash}`)
                var a = document.createElement('a')
                let tempString
                if (netowrkName == 'ropsten') {
                    tempString = 'https://ropsten.etherscan.io/tx/' + hash
                }
                if (netowrkName == 'matic') {
                    tempString =
                        'https://testnetv3-explorer.matic.network/tx/' + hash
                }
                a.href = tempString
                a.title = tempString
                var link = document.createTextNode(tempString)
                a.appendChild(link)
                // document.body.prepend(a)
                // var br = document.createElement('br')
                // a.appendChild(br)
                alert(a)
            }).once('confirmation', function (confirmationNumber, receipt) {
                console.log(receipt)
            })
        }
    )
}

const connectWallet = async function () {
    if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
        // Ethereum user detected. You can now use the provider.
        const provider = window['ethereum']
        let accounts = await provider.enable()
        document.getElementById('toWhom').value = accounts[0]
        document.getElementById('toWhom1').value = accounts[0]
        console.log(provider.networkVersion)
        var _chainId = provider.networkVersion

        //var chainId = parseInt(_chainId);
        domainDataERC20.chainId = _chainId
        console.log(_chainId)

        if (_chainId == 3) {
            netowrkName = 'ropsten'
        }
        if (_chainId == 15001) {
            netowrkName = 'matic'
        }
        showFaucetLink()
        web3 = new Web3(provider)
        if (netowrkName == 'ropsten') {
            biconomy = new Biconomy(window.ethereum, {
                apiKey: 'sdLlgS_TO.8a399db4-82ec-410c-897b-c77faab1ad1d',
                debug: 'true',
            })
            web3 = new Web3(biconomy)
            biconomy
                .onEvent(biconomy.READY, async () => {
                    console.log('hello')

                    //await justTrying();
                })
                .onEvent(biconomy.ERROR, (error, message) => {
                    console.log(error)
                })
        }
        if (netowrkName == 'matic') {
            biconomy = new Biconomy(window.ethereum, {
                apiKey: 'Q34QBan9O.1fb12039-9bbe-45d2-a1f9-22cbb2636fe9',
                debug: 'true',
            })
            web3 = new Web3(biconomy)
            biconomy
                .onEvent(biconomy.READY, async () => {
                    console.log('hello')
                    //await justTrying();
                })
                .onEvent(biconomy.ERROR, (error, message) => {
                    console.log(error)
                })
        }
        contract = new web3.eth.Contract(
            config.contract.routerABI,
            config[netowrkName].routerAddress
        )

        //console.log(await contract.methods.getQuote().call());
    } else {
        alert('Install meatamask first:  https://metamask.io/ ')
    }
}
const getSignatureParameters = (signature) => {
    if (!web3.utils.isHexStrict(signature)) {
        throw new Error(
            'Given value "'.concat(signature, '" is not a valid hex string.')
        )
    }
    var r = signature.slice(0, 66)
    var s = '0x'.concat(signature.slice(66, 130))
    var v = '0x'.concat(signature.slice(130, 132))
    v = web3.utils.hexToNumber(v)
    if (![27, 28].includes(v)) v += 27
    return {
        r: r,
        s: s,
        v: v,
    }
}
const sendPermitTransaction = async (
    owner,
    spender,
    value,
    deadline,
    v,
    r,
    s
) => {
    if (web3 && erc20Contract) {
        try {
            console.log('hi::::::::::')
            let gasLimit = await erc20Contract.methods
                .permit(owner, spender, value, deadline, v, r, s)
                .estimateGas({ from: owner })
            let gasPrice = await web3.eth.getGasPrice()
            console.log(gasLimit)
            console.log(gasPrice)
            let tx = erc20Contract.methods
                .permit(owner, spender, value, deadline, v, r, s)
                .send({
                    from: owner,
                    gasPrice: web3.utils.toHex(gasPrice),
                    gasLimit: web3.utils.toHex(gasLimit),
                })

            tx.on('transactionHash', function (hash) {
                console.log(`Transaction hash is ${hash}`)
            }).once('confirmation', function (confirmationNumber, receipt) {
                let elements = document.getElementsByClassName('loader')
                elements[0].style.display = 'none'
                console.log(receipt)
                alert('tokens unlocked')
            })
        } catch (error) {
            console.log(error)
        }
    }
}
const getPermit = async function (token, _value) {
    let value = web3.utils.toWei(_value)
    erc20Contract = new web3.eth.Contract(
        config.contract.erc20ABI,
        config[netowrkName][token]
    )
    console.log(config[netowrkName][token])
    console.log(erc20Contract)
    let message = {}
    var userAddress = ethereum.selectedAddress
    var owner = userAddress
    var spender = config[netowrkName].routerAddress
    var now = await getNow()
    var deadline = now + 60 * 60
    var nonce = await erc20Contract.methods.nonces(userAddress).call()

    message.owner = userAddress
    message.spender = spender
    message.value = value
    message.nonce = parseInt(nonce)
    message.deadline = deadline

    domainDataERC20.name = token
    domainDataERC20.verifyingContract = config[netowrkName][token]

    const dataToSign = {
        types: {
            EIP712Domain: domainType,
            Permit: permitType,
        },
        domain: domainDataERC20,
        primaryType: 'Permit',
        message: message,
    }
    const sigString = JSON.stringify(dataToSign)
    console.log(dataToSign)

    web3.currentProvider.send(
        {
            jsonrpc: '2.0',
            id: 999999999999,
            method: 'eth_signTypedData_v4',
            params: [userAddress, sigString],
        },
        function (error, response) {
            console.log(response)
            let elements = document.getElementsByClassName('loader')
            elements[0].style.display = 'inline-block'
            let { r, s, v } = getSignatureParameters(response.result)
            sendPermitTransaction(owner, spender, value, deadline, v, r, s)
        }
    )
}
const getNow = async function () {
    var latestBlock = await web3.eth.getBlock('latest')
    var now = latestBlock.timestamp
    return parseInt(now)
}
// function getAmountWithDecimals(_tokenAmount) {
//     var decimals = web3.utils.toBN(18)
//     var tokenAmount = web3.utils.toBN(_tokenAmount)
//     var tokenAmountHex = tokenAmount.mul(web3.utils.toBN(10).pow(decimals))
//     return web3.utils.toHex(tokenAmountHex)
// }

const getAmountOut = async function (
    inputAmount,
    inputTokenName,
    outputTokenName
) {
    if (web3 && contract) {
        let path = [
            config[netowrkName][inputTokenName],
            config[netowrkName][outputTokenName],
        ]
        // let inputAmountDecimals = getAmountWithDecimals(inputAmount)
        // console.log(inputAmountDecimals)

        let amountsOut = await contract.methods
            .getAmountsOut(inputAmount, path)
            .call()
        let outputString = amountsOut[1].toString()
        return outputString
    } else {
        alert('coninputAmountnectWallet first')
    }
}

const swapExactTokensForTokens = async function (
    amount,
    inputTokenName,
    outputTokenName,
    to
) {
    var now = await getNow()
    var deadline = now + 60 * 60
    let path = [
        config[netowrkName][inputTokenName],
        config[netowrkName][outputTokenName],
    ]
    let amountsOutMin = await getAmountOut(
        amount,
        inputTokenName,
        outputTokenName
    )
    let data = contract.methods
        .swapExactTokensForTokens(
            web3.utils.toWei(amount.toString(), 'ether'),
            amountsOutMin,
            path,
            to,
            deadline
        )
        .encodeABI()
    // web3.eth.sendTransaction({from:from,to:config[netowrkName].routerAddress,data:data});
    forwarderEIP2585(data)
}
const getBalanceERC20 = async function (ERC20address, wadAddress) {
    let tempERC20Contract = new web3.eth.Contract(
        config.contract.erc20ABI,
        ERC20address
    )
    let balance = await tempERC20Contract.methods.balanceOf(wadAddress).call()
    // console.log(await ERC20Contract.methods.decimals().call());
    console.log(balance)

    let balanceWithDecimals = web3.utils.fromWei(balance)
    return balanceWithDecimals
}
const getMax = async function (inputElementId, outputElementId) {
    let wadAddress = ethereum.selectedAddress
    console.log(wadAddress)
    let inputToken = document.getElementById(inputElementId)
    let inputTokenName = inputToken.options[inputToken.selectedIndex].value
    let inputTokenaddress = config[netowrkName][inputTokenName]
    console.log(inputTokenaddress)
    let balance = await getBalanceERC20(inputTokenaddress, wadAddress)
    document.getElementById(outputElementId).value = balance
}
const swap = async function () {
    let inputToken = document.getElementById('inputToken')
    let inputTokenName = inputToken.options[inputToken.selectedIndex].value
    let outputToken = document.getElementById('outputToken')
    let outputTokenName = outputToken.options[outputToken.selectedIndex].value
    let toWhom = document.getElementById('toWhom').value
    console.log(toWhom)

    let inputAmount = document.getElementById('input').value
    await swapExactTokensForTokens(
        inputAmount,
        inputTokenName,
        outputTokenName,
        toWhom
    )
}

const unlockToken = async function (inputSelectElementId, inputValueElementId) {
    let inputToken = document.getElementById(inputSelectElementId)
    let inputTokenName = inputToken.options[inputToken.selectedIndex].value
    let inputAmount = document.getElementById(inputValueElementId).value
    await getPermit(inputTokenName, inputAmount)
}

const getExchangeRate = async function () {
    let inputToken = document.getElementById('inputToken')
    let inputTokenName = inputToken.options[inputToken.selectedIndex].value
    let outputToken = document.getElementById('outputToken')
    let outputTokenName = outputToken.options[outputToken.selectedIndex].value

    let inputAmount = document.getElementById('input').value
    console.log(inputTokenName)
    console.log(outputTokenName)
    console.log(inputAmount)
    let amountsInDecimals = web3.utils.toWei(inputAmount, 'ether')
    console.log(amountsInDecimals)

    let amountsOutDecimals = await getAmountOut(
        amountsInDecimals,
        inputTokenName,
        outputTokenName
    )
    let amountOut = web3.utils.fromWei(amountsOutDecimals, 'ether')
    //  console.log(amountOut);
    document.getElementById('output').value = amountOut

    // // let amountsOut = web3.utils.fromWei(amountsOutDecimals,"ether");
    // console.log(amountsOutDecimals.toString());
}
const addLiquidity = async function () {
    let inputToken1 = document.getElementById('inputToken1')
    let inputToken1Name = inputToken1.options[inputToken1.selectedIndex].value
    let inputToken2 = document.getElementById('inputToken2')
    let inputToken2Name = inputToken1.options[inputToken2.selectedIndex].value

    let inputAmount1 = document.getElementById('input1').value
    let inputAmount2 = document.getElementById('input2').value

    let toWhom = document.getElementById('toWhom1').value
    let now = await getNow()
    let expiry = now + 3600
    console.log(toWhom)

    let data = contract.methods
        .addLiquidity(
            config[netowrkName][inputToken1Name],
            config[netowrkName][inputToken2Name],
            web3.utils.toWei(inputAmount1.toString(), 'ether'),
            web3.utils.toWei(inputAmount2.toString(), 'ether'),
            0,
            0,
            toWhom,
            expiry
        )
        .encodeABI()
    forwarderEIP2585(data)
}

// init();

var moduleTry = {
    connectWallet,
    getExchangeRate,
    swap,
    unlockToken,
    getMax,
    addLiquidity,
}
module.exports = moduleTry

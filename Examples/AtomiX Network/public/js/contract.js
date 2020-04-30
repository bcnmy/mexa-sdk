async function getEthBalance() {
    let promise = new Promise((res, rej) => {
        web3.eth.getBalance(ethereum.selectedAddress, function(error, result) {
            if (!error)
                res(result);
            else
                rej(error);
        });
    });
    let result = await promise;
    return result;
}

async function getTokenBalance(_address = ethereum.selectedAddress) {
    let promise = new Promise((res, rej) => {
        Coin.balanceOf(_address, function(error, result) {
            if (!error)
                res(result);
            else
                rej(error);
        });
    });
    let result = await promise;
    return result;
}

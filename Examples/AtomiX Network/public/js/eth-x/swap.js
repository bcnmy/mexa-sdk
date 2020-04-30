async function init(){

    var connectionEle = document.getElementById("connection");
    connectionEle.classList.toggle("col-warning", true);
    connectionEle.innerText = "Testing Connection";
    if(await testConnection()){
        connectionEle.classList.toggle("col-warning", false);
        connectionEle.classList.toggle("col-error", false);
        connectionEle.classList.toggle("col-success", true);
        connectionEle.innerText = "Connected";
    }
    else{
        connectionEle.classList.toggle("col-success", false);
        connectionEle.classList.toggle("col-warning", false);
        connectionEle.classList.toggle("col-error", true);
        connectionEle.innerText = "Not Connected";
        showModal("Error", "Connection Failed");
    }

    await updateDetails();
    document.getElementById("formSwapSubmit").addEventListener("click", swap);
    connectionEle.addEventListener("click", init);
    document.getElementsByClassName("close-modal")[0].addEventListener("click", closeModal);
}

async function updateDetails(){

    document.getElementById("accAdd").innerText = trimAdd(ethereum.selectedAddress);
    let userContract = await getUserContract();
    console.log("userContract:", userContract)
    document.getElementById("wallAdd").innerText = trimAdd(userContract.userContract);
    document.getElementById("accEthBal").innerText = parseFloat(web3.fromWei(await getEthBalance())).toFixed(2);
    document.getElementById("accTokenBal").innerText = parseFloat(web3.fromWei(await getTokenBalance(userContract.userContract))).toFixed(2);

}

async function tokenSwap() {
    if (await testConnection()){

        let swapAmount = parseInt(web3.toWei(document.getElementById("formSwapAmount").value, 'ether'));

        let promise = new Promise((res, rej) => {
            Coin.burn(swapAmount, function(error, result) {
                if (!error)
                    res(result);
                else
                    rej(error);
            });
        });
        let result = await promise;
        console.log(result);

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                console.log(this.responseText)
            }
        };
        xhttp.open("POST", endpoint + "/eth-x", true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send("txnHash=" + result + "&redeemAdd=" + document.getElementById("redeemAdd").value );

        return result;
    }
    else{
        return false;
    }

}

async function swap(){

    document.getElementById("formSwapSubmit").innerHTML = "Processing";

    if(parseFloat(document.getElementById("formSwapAmount").value) < 0.0000001){
        showModal(title="Error", body="A Minimum of 1 ANC required.");
    }
    else{
        const res = await tokenSwap();
        if(res == false){
            showModal(title="Error", body="Not Connected to Server");
        }
        else{
            showModal(title="Success", body="Transaction Queued");
        }
    }

    document.getElementById("formSwapSubmit").innerHTML = "Swap";
}

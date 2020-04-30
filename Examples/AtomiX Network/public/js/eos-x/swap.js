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
        let txnHash = document.getElementById("txnHash").value ;

        if (txnHash.length == 71){
            let promise = new Promise((res, rej) => {
                var xhttp = new XMLHttpRequest();
                xhttp.onreadystatechange = function() {
                    if (this.readyState == 4 && this.status == 200) {
                        console.log(this.responseText)
                        res(this.responseText)
                    }
                };
                xhttp.open("POST", endpoint + "/eos-x", true);
                xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhttp.send("txnHash=" + txnHash );
            });
        }
        else{
            return {
                'success':false,
                'data':"Invalid Txn Hash"
            }
        }

        let result = await promise;
        return JSON.parse(result);
    }
    else{
        return false;
    }

}


async function swap(){

    document.getElementById("formSwapSubmit").innerHTML = "Processing";
    let obj = await tokenSwap();
    if(obj['success'] == true){
        messageTitle = "Success"
        messageHTML = obj['data'];
    }
    else{
        messageTitle = "Error"
        messageHTML = obj['data'];
    }

    showModal(title=messageTitle, body=messageHTML);

    document.getElementById("formSwapSubmit").innerHTML = "Swap";
}

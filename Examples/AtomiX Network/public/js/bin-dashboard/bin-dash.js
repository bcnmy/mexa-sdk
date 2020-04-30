var connectionEle = document.getElementById("connection");
async function init(){

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

    }

    await updateDetails();
}

connectionEle.addEventListener("click", init);
document.getElementById("formGetBinBal").addEventListener("click", getBinBal);
document.getElementById("historyUpdate").addEventListener("click", historyUpdate);

if (localStorage.getItem('binAdd') != null) {
    document.getElementById("binAdd").value = localStorage.getItem('binAdd');
    getBinBal();
}

async function updateDetails(){

    document.getElementById("accAdd").innerText = trimAdd(ethereum.selectedAddress);
    let userContract = await getUserContract();
    console.log("userContract:", userContract)
    document.getElementById("wallAdd").innerText = trimAdd(userContract.userContract);
    document.getElementById("accEthBal").innerText = parseFloat(web3.fromWei(await getEthBalance())).toFixed(2);
    document.getElementById("accTokenBal").innerText = parseFloat(web3.fromWei(await getTokenBalance(userContract.userContract))).toFixed(2);

    await historyUpdate();

}


async function historyUpdate(){

    let defAdd = "tbnb16uq5gcvg25psr2gqt5y0svn4j53n39lzxkuvl7";

    var binTxnTable = document.getElementById('binTxnTable');
    while (binTxnTable.firstChild) {
        binTxnTable.removeChild(binTxnTable.firstChild);
    }

    fetch("https://testnet-dex.binance.org/api/v1/transactions?limit=10&txAsset=ANC-3EF&address="+defAdd)
    .then((resp) => resp.json())
    .then(function(data) {

        let txns = data['tx'];
        for(txnIndex in txns){

            let txndata = txns[txnIndex];
            let txnHash = txns[txnIndex]['txHash'];
            let txnHashTrim = trimTxnHash(txnHash);

            let html = "<tr> \
            <td data-label='From'><a style='text-decoration:none;' href='https://testnet-explorer.binance.org/address/"+(txndata['fromAddr'])+"' target='_blank'>"+trimTxnHashl(txndata['fromAddr'])+"</a></td> \
            <td data-label='To'><a style='text-decoration:none;' href='https://testnet-explorer.binance.org/address/"+txndata['toAddr']+"' target='_blank'>"+trimTxnHashl(txndata['toAddr'])+"</td> \
            <td data-label='TxType'><span class='sw-label mt-0'>"+txndata['txType']+"</span></td> \
            <td data-label='Amount'>"+parseFloat(txndata['value']).toFixed(2)+"</td> \
            <td data-label='Txn'><a style='text-decoration:none;' href='https://testnet-explorer.binance.org/tx/"+txnHash+"' target='_blank'>"+txnHashTrim+"</a></td> \
            </tr>";

            binTxnTable.insertAdjacentHTML('beforeend', html);
        }
    })
    .catch(function(error) {
        showModal(title="Error", body=error);
    });

}

async function getBinBal(){

    document.getElementById("formGetBinBal").innerHTML = "Processing";

    let binAdd = document.getElementById("binAdd").value;
    if(binAdd.length != 43){
        showModal(title="Error", body="Invalid Address");
        document.getElementById("formGetBinBal").innerHTML = "Update Balance";
    }
    else{

        localStorage.setItem('binAdd', binAdd);

        fetch("https://testnet-dex.binance.org/api/v1/account/"+ binAdd)
        .then((resp) => resp.json())
        .then(function(data) {
            var f = false;
            let balances = data['balances'];
            for(index in balances){
                if(balances[index]['symbol'] == "ANC-3EF"){
                    document.getElementById("accBinBal").innerHTML = parseFloat(balances[index]['free']).toFixed(2);
                    f = true;
                    break;
                }
            }
            if (f == false){
                document.getElementById("accEosaccBinBalBal").innerHTML = "0";
            }
            document.getElementById("formGetBinBal").innerHTML = "Update Balance";
        })
        .catch(function(error) {
            showModal(title="Error", body=error);
        });
    }

}

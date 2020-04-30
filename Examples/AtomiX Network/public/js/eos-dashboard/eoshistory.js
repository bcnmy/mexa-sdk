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
document.getElementById("formGetEosBal").addEventListener("click", getEosBal);
document.getElementById("historyUpdate").addEventListener("click", historyUpdate);

if (localStorage.getItem('eosAdd') != null) {
    document.getElementById("eosAdd").value = localStorage.getItem('eosAdd');
    getEosBal();
}
// document.getElementsByClassName("close-modal")[0].addEventListener("click", closeModal);

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

    var eosTxnTable = document.getElementById('eosTxnTable');
    while (eosTxnTable.firstChild) {
        eosTxnTable.removeChild(eosTxnTable.firstChild);
    }

    fetch("https://junglehistory.cryptolions.io/v2/history/get_actions?account=antestacc111&limit=10&sort=desc")
    .then((resp) => resp.json())
    .then(function(data) {
        console.log(data);
        let actions  = data['actions'];
        for(actionIndex in actions){
            if(actionIndex > 10)
                break
            // console.log(actions[actionIndex]);
            let txndata = actions[actionIndex]['act']['data'];
            let txnHash = actions[actionIndex]['trx_id'];
            let txnHashTrim = trimTxnHash(txnHash);

            let html = "<tr> \
            <td data-label='From'><a style='text-decoration:none;' href='https://jungle.bloks.io/account/"+txndata['from']+"' target='_blank'>"+txndata['from']+"</td> \
            <td data-label='To'><a style='text-decoration:none;' href='https://jungle.bloks.io/account/"+txndata['to']+"' target='_blank'>"+txndata['to']+"</td> \
            <td data-label='TxType'><span class='sw-label mt-0'>"+actions[actionIndex]['act']['name']+"</span></td> \
            <td data-label='Amount'>"+txndata['quantity']+"</td> \
            <td data-label='Txn'><a style='text-decoration:none;' href='https://jungle.bloks.io/transaction/"+txnHash+"' target='_blank'>"+txnHashTrim+"</a></td> \
            </tr>";

            eosTxnTable.insertAdjacentHTML('beforeend', html);
        }

    })
    .catch(function(error) {
        showModal(title="Error", body=error);
    });

}

async function getEosBal(){

    document.getElementById("formGetEosBal").innerHTML = "Processing";

    let eosAdd = document.getElementById("eosAdd").value;

    if(eosAdd.length != 12){
        showModal(title="Error", body="Invalid Address");
        document.getElementById("formGetEosBal").innerHTML = "Update Balance";
    }
    else{

        localStorage.setItem('eosAdd', eosAdd);

        let url = "https://junglehistory.cryptolions.io/v2/state/get_tokens?account="+ eosAdd;

        fetch(url)
        .then((resp) => resp.json())
        .then(function(data) {
            let tokenList = data['tokens'];
            var f = false;
            for(index in tokenList){
                if(tokenList[index]['symbol'] == "ANT"){
                    document.getElementById("accEosBal").innerHTML = tokenList[index]['amount'];
                    f = true;
                    break;
                }
            }
            if (f == false){
                document.getElementById("accEosBal").innerHTML = "0";
            }
        })
        .catch(function(error) {
            showModal(title="Error", body=error);
        });

        document.getElementById("formGetEosBal").innerHTML = "Update Balance";
    }

}

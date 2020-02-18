//StateChange Contract ABI
const abi = [ { "constant": true, "inputs": [], "name": "storeData", "outputs": [ { "name": "", "type": "string" } ], "payable": false, "stateMutability": "view", "type": "function", "signature": "0x4abe3052" }, { "constant": false, "inputs": [ { "name": "new_value", "type": "string" } ], "name": "setValue", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function", "signature": "0x93a09352" }, { "constant": true, "inputs": [], "name": "getValue", "outputs": [ { "name": "", "type": "string" } ], "payable": false, "stateMutability": "view", "type": "function", "signature": "0x20965255" } ];

//contract address. please change the address to your own
const contractAddress = "0x9CA27E862f33FC3c049828aD37618D48d690252f";

window.onload = function () {
    let biconomy ;

    // check to see if user has metamask addon installed on his browser. check to make sure web3 is defined
    if (window.Biconomy) {
        alert("sdfasdf");
        let Biconomy = window.Biconomy.default;
        biconomy = new Biconomy(window.ethereum,{dappId: "5e4ba8695147862df513f332", apiKey: "xOZqVRVoB.a4306a94-7591-4d0b-9c69-327d7f138941"});
        web3 = new Web3(biconomy);
    }  
    else {
        document.getElementById('metamask').innerHTML = 'You need <a href=”https://metamask.io/">MetaMask</a> browser plugin to run this example';
    }
   
    //check if Biconomy is initialised properly
    biconomy.on(biconomy.READY, () => {
        // Initialize your dapp here or call the your function here
        getvalue();
    }).on(biconomy.ERROR, (error, message) => {
        // Handle error while initializing mexa
        alert("error while initialising biconomy");
    });
    // web3 = new Web3(window.ethereum);
    // this.getvalue();
}

function setValue() {
    try {
        var value = document.getElementById("xvalue").value;

        console.log(value);
        // var web3js = new Web3(window.web3.currentProvider);

        var MyContract = new web3.eth.Contract(abi, contractAddress ,{from :"0xF86B30C63E068dBB6bdDEa6fe76bf92F194Dc53c" });

        MyContract.methods.setValue(value).send()
            .on("transactionHash",hash=> {
                console.log("transactionHash :: ");
                console.log(hash);
            })
            .once("confirmation",(confirmation,receipt)=>{
                alert('got confirmation');
                getvalue();
                console.log(receipt);
            })
            .on('error', console.error);
    }
    catch (err) {
        document.getElementById("xbalance").innerHTML = err;
    }
}

//function to retrieve the last inserted value on the blockchain
async function getvalue() {
    try {
        //instantiate and connect to contract address via Abi
        var myfunction = new web3.eth.Contract(abi,contractAddress);
        //call the get function of our SimpleStorage contract
        let name = await myfunction.methods.getValue().call() ;
        console.log(name);
        document.getElementById("xbalance").innerHTML = name;
    }
    catch (err) {
        document.getElementById("xbalance").innerHTML = err;
    }
}
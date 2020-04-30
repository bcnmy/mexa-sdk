setInterval(()=>{
    try {
        document.getElementsByTagName('pre')[0].remove();
    } catch (error) {

    }
}, 2000)
window.addEventListener('load', async () => {
    document.getElementById("getStarted").addEventListener("click", gotoSwapPage);



});

function gotoSwapPage(){
    var chain1 = document.getElementById("chain1");
    var chain1Value = chain1.options[chain1.selectedIndex].value;
    var chain2 = document.getElementById("chain2");
    var chain2Value = chain2.options[chain2.selectedIndex].value;
    console.log(chain1Value);
    console.log(chain2Value);
    if(chain1Value == chain2Value){
        console.log("Cannot swap between same chains");
    }
    else if(chain1Value == "Binance"){
        window.location.href = '/bin-x';
    }
    else if(chain1Value == "Ethereum"){
        window.location.href = '/eth-x';
    }
    else if(chain1Value == "EOS"){
        window.location.href = '/eos-x';
    }
}



function launchTransak() {
    let transak = new TransakSDK.default({
      apiKey: '13e83ebf-5430-4018-aae3-b16d63d83701',
      environment: 'STAGING',
      defaultCryptoCurrency: 'ETH',
      walletAddress: '',
      themeColor: '#ffffff',
      fiatCurrency: 'INR',
      email: '',
      redirectURL: '/',
      hostURL: window.location.origin,
      widgetHeight: '600px',
      widgetWidth: '100%',
      exchangeScreenTitle:'AtomiX Network'
    });
    transak.init();
    transak
      .on(transak.ALL_EVENTS, (data) => {
        console.log(data);
      });
    transak.on(transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, (orderData) => {
      console.log(orderData);
      alert(orderData);
      transak.close();
    });
  }

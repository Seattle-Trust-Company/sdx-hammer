
// Imports
const Web3 = require('web3');

// Set-up Web3
let web3 = new Web3("http://localhost:8000");


function sendEth () {
  web3.eth.sendTransaction({
    'from': account,
    'to': '0x28843029432',
    'value': 10000
  }).then()
}

// Get Accounts
function getAccounts () {
web3.eth.getAccounts().then(
  (accounts) => {
    console.log("Accounts " + accounts)
    let account = accounts[0]
    console.log("Account: " + account)
    return account;
  }

).then(
  (account) => {
    console.log("Then Account:" +  account)
  
    web3.eth.getBalance(account)
    .then((balance) => {
      console.log("Balance: " + balance)
    })
  }
).then(sendEth)
}


function start () {

  // Get Peer Count
  web3.eth.net.getPeerCount().then(
    (peerCount) => console.log("Peer Count: " + peerCount)
  ).then(getAccounts)
}

// @desc  Main Driver
// @note  Once we submit a transaction to the bootnode, check after some time that ...
//        the transaction was placed on the ledger. Maybe check from a miner. Then, we can hammer.
function main () {
  start()

  // Get Peer Count

  // Get Own Account

  // Get Balance

  // Unlock Account

  // Send Transaction(s)

  // After X amount of transactions,
  // we can evaluate performance.

}

// Call Main Function
main();


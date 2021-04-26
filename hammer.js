
// Imports
const Web3 = require('web3');

// Set-up Web3
let web3 = new Web3("http://localhost:8000");

// @desc  Main Driver
// @note  Once we submit a transaction to the bootnode, check after some time that ...
//        the transaction was placed on the ledger. Maybe check from a miner. Then, we can hammer.
const main = async() => {

  // Get Peer Count
  let peerCount = await web3.eth.net.getPeerCount()
  console.log("Peer Count: " + peerCount)

  // Get Own Account
  let accounts = await web3.eth.getAccounts()
  let account = accounts[0]
  console.log("Account: " + account)

  // Get Balance
  let balance = await web3.eth.getBalance(account)
  console.log("Balance: " + balance)

  // Unlock Account
  await web3.eth.personal.unlockAccount(account, '12345', 600)

  // @TODO: Send X Transactions for Y amount of time
  // @FIXME: Get rid of awaits
  // @TODO: Measure how many sent


  // Send Transaction(s)
  let receiver = account
  let transaction = await web3.eth.sendTransaction({
    'from': account,
    'to': receiver,
    'value': 10000
  })
  console.log("Transaction: ", transaction)
  let transactionBlock = transaction['blockNumber']

  // Check Block
  let block = await web3.eth.getBlock(transactionBlock, true)
  console.log("Block: ", block)

  // After X amount of transactions,
  // we can evaluate performance.
  // @TODO: Measure how many total mined
  // @TODO: Adjust pool sizes
  // @TODO: Measure how many each pool mined

}

// Call Main Function
main()


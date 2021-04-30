/*
 * @file  hammer.js
 * @desc  NA
 * @note  Make sure RECIPIENTS are connected to bootnode
 * @TODO  Add more pools and make larger
 */


/** Imports **/
const Web3 = require('web3');
let web3 = new Web3("http://localhost:8000");


/** Globals **/

const NUM_TRANSACTIONS = 4;
const RECIPIENTS = ['0x3796Fd13E83d53B8378A2C849F0E1AcA29e8C144'];
const POOLS = {
  '0x9Dca0717054729D9A199162508C491ee6E5998cE': {
    name: 'bigsur',
    address: '0x9Dca0717054729D9A199162508C491ee6E5998cE',
    size: 4
  }
}


/** Functions **/

// @desc Send Transactions
function sendTransaction(transactions, account, receiver, date) {

  // Send Transaction
  let transaction = web3.eth.sendTransaction({
    'from': account,
    'to': receiver,
    'value': 10000
  })

  // Create Object
  let obj = {
    sent: date,
    data: transaction
  }

  // Add to Transactions Set
  transactions.push(obj)

}

async function getResult(transaction, data, results, blocks) {
  p = new Promise(async function (resolve, reject) {
    // Get Mined Time (if not in cache)
    if (!blocks[data.blockNumber]) {
      let block = await web3.eth.getBlock(data.blockNumber)
      let newBlock = {
        miner: block.miner,
        blockNumber: data.blockNumber,
        timestamp: block.timestamp,
        convertedTimestamp: new Date(block.timestamp * 1000)
      }
      blocks[data.blockNumber] = newBlock;
    }

    // Log Information
    let result = {
      hash: data.transactionHash,
      blockNumber: data.blockNumber,
      sent: transaction.sent,
      miner: blocks[data.blockNumber].miner,
      mined: blocks[data.blockNumber].convertedTimestamp,
      duration: Math.abs(blocks[data.blockNumber].convertedTimestamp - transaction.sent)
    }
    resolve(result);
  })
  return p;
}

async function getTransactionResults(transactions) {
  // Create Promise
  p = new Promise(async function (resolve, reject) {
    let blocks = {}   // Block Cache
    let results = {}  // Results

    // Create Evaluation Input
    count = 0;
    for (let i = 0; i < NUM_TRANSACTIONS; i++) {
      transaction = transactions[i];
      count++;
      let data = await transaction.data.then(async (data) => {
        let result = await getResult(transaction, data, results, blocks);
        results[data.transactionHash] = result;
      })
    }
    if (count == NUM_TRANSACTIONS) resolve(results);
  })
  return p;
}

// @desc  Main Driver
// @note  Once we submit a transaction to the bootnode, check after some time that ...
//        the transaction was placed on the ledger. Maybe check from a miner. Then, we can hammer.
const main = async () => {

  // Setup Web3
  let peerCount = await web3.eth.net.getPeerCount()
  let accounts = await web3.eth.getAccounts()
  let account = accounts[0]
  let balance = await web3.eth.getBalance(account)
  await web3.eth.personal.unlockAccount(account, '12345', 60000)

  // Log Information
  console.log("RUN INFORMATION")
  console.log("Peer Count: " + peerCount)
  console.log("Account: " + account)
  console.log("Balance: " + balance)
  console.log("Target Transaction Amount: " + NUM_TRANSACTIONS)
  console.log("")

  // Create List of Transactions
  let transactions = []

  // Send Transactions without Waiting
  for (i = 0; i < NUM_TRANSACTIONS; i++) {
    let receiver = RECIPIENTS[0];
    let currentDate = new Date()
    sendTransaction(transactions, account, receiver, currentDate);
  }

  // Get Transaction Results for Evaluation
  const results = await getTransactionResults(transactions);

  // Set Up Results per Pool
  let poolResults = {}
  for (const pool in POOLS) {
    poolResults[POOLS[pool].address] = {
      duration: 0,
      transactionCount: 0
    }
  }

  // Performance Evaluation
  let totalDuration = 0;
  for (const result in results) {
    // Total Duration
    totalDuration += results[result].duration

    // Durations per Pool
    poolResults[results[result].miner].transactionCount += 1
    poolResults[results[result].miner].duration += results[result].duration

  }

  // Print Total Evaluation Results
  console.log("NETWORK PERFORMANCE EVALUATION")
  console.log("Total Duration (ms): " + totalDuration)
  console.log("")

  // Print Pool Evaluation Results
  console.log("POOL-SPECIFIC PERFORMANCE EVALUATION")
  for (const pool in poolResults) {
    console.log("Pool " + POOLS[pool].name + " Results")
    console.log("  Number of Miners: " + POOLS[pool].size)
    console.log("  Transaction Count: " + poolResults[pool].transactionCount)
    console.log("  Transaction Percentage: " + (poolResults[pool].transactionCount / NUM_TRANSACTIONS * 100) + "%")
    console.log("  Average Transaction Duration (ms): " + (poolResults[pool].duration / poolResults[pool].transactionCount))
  }

}

// Call Main Function
main();


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

const NUM_TRANSACTIONS = 3000;
const RECIPIENTS = ['0x3796Fd13E83d53B8378A2C849F0E1AcA29e8C144'];
const POOLS = {
  '0x9Dca0717054729D9A199162508C491ee6E5998cE': {
    name: 'bigsur',
    address: '0x9Dca0717054729D9A199162508C491ee6E5998cE',
    size: 2
  },
  '0x4Dd7deF2eD4c5eeDc234bC9f56A5106baCf1c1Ab': {
    name: 'tahoe',
    address: '0x4Dd7deF2eD4c5eeDc234bC9f56A5106baCf1c1Ab',
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

async function getResult(transaction, data, results, blocks, timeDifference) {
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
    let dur = (blocks[data.blockNumber].convertedTimestamp - transaction.sent) - timeDifference
    let result = {
      hash: data.transactionHash,
      blockNumber: data.blockNumber,
      sent: transaction.sent,
      miner: blocks[data.blockNumber].miner,
      mined: blocks[data.blockNumber].convertedTimestamp,
      duration: dur
    }
    resolve(result);
  })
  return p;
}

async function getTransactionResults(transactions, timeDifference) {
  // Create Promise
  p = new Promise(async function (resolve, reject) {
    let blocks = {}   // Block Cache
    let results = {}  // Results

    // Create Evaluation Input
    for (let i = 0; i < NUM_TRANSACTIONS; i++) {
      transaction = transactions[i];
      let data = await transaction.data
        .catch((err) => {
          reject(new Error('Transaction Failed'))
        }).then(async (data) => {
          let result = await getResult(transaction, data, results, blocks, timeDifference);
          results[data.transactionHash] = result;
        })
    }
    resolve(results);
  })
  return p;
}

// @desc  Main Driver
// @note  Once we submit a transaction to the bootnode, check after some time that ...
//        the transaction was placed on the ledger. Maybe check from a miner. Then, we can hammer.
const main = async () => {

  // Setup Web3
  const peerCount = await web3.eth.net.getPeerCount()
  const accounts = await web3.eth.getAccounts()
  const account = accounts[0]
  const balance = await web3.eth.getBalance(account)

  // Run Information
  console.log("RUN INFORMATION")
  console.log("Peer Count: " + peerCount)
  console.log("Account: " + account)
  console.log("Balance: " + balance)
  console.log("Target Transaction Amount: " + NUM_TRANSACTIONS)
  console.log("")

  // Unlock Account and Determine Latency
  const beforeUnlockTime = new Date()
  await web3.eth.personal.unlockAccount(account, '12345', 300)
  const afterUnlockTime = new Date()
  const latency = (afterUnlockTime - beforeUnlockTime) / 2

  // Find Difference in Time Synchronization ...
  // ... by sending and waiting for 1 transaction
  let transaction = await web3.eth.sendTransaction({
    'from': account,
    'to': RECIPIENTS[0],
    'value': 10000
  })
  const afterTransactionTime = new Date()

  // Get Block Timestamp
  const setupBlock = await web3.eth.getBlock(transaction.blockNumber)
  const setupBlockMineTime = new Date(setupBlock.timestamp * 1000)
  const timeDifference = setupBlockMineTime - afterTransactionTime - latency

  // Run-Time Information
  console.log("RUN-TIME INFORMATION")
  console.log("Latency: " + latency)
  console.log("Received Confirmation At: " + afterTransactionTime)
  console.log("Block Timestamp: " + setupBlockMineTime)
  console.log("Timestamp Difference (ms): " + timeDifference)
  console.log("")

  // Create List of Transactions
  let transactions = []

  // Send Transactions without Waiting
  for (i = 0; i < NUM_TRANSACTIONS; i++) {
    let receiver = RECIPIENTS[0];
    let currentDate = new Date()
    sendTransaction(transactions, account, receiver, currentDate);
  }
  console.log("Sent Transactions")

  // Get Transaction Results for Evaluation
  const results = await getTransactionResults(transactions, timeDifference);
  console.log("Got Transaction Results")

  // Set Up Results per Pool
  let poolResults = {}
  for (const pool in POOLS) {
    poolResults[POOLS[pool].address] = {
      duration: 0,
      transactionCount: 0
    }
  }
  console.log("After Set up Pool Results")

  // Performance Evaluation
  let totalDuration = 0;
  for (const result in results) {
    // Total Duration
    totalDuration += results[result].duration

    // Durations per Pool
    poolResults[results[result].miner].transactionCount += 1
    poolResults[results[result].miner].duration += results[result].duration

  }
  console.log("After Set up Results")

  // Print Total Evaluation Results
  console.log("NETWORK PERFORMANCE EVALUATION")
  console.log("Total Duration (ms): " + totalDuration)
  console.log("Duration per Transaction (ms): " + (totalDuration / NUM_TRANSACTIONS))
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


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
const BATCH_SIZE = 2;
const PASSWORD = '12345';
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
function sendTransaction(transactions, sendTimes, account, receiver, date) {

  // Send Transaction
  let transaction = web3.eth.sendTransaction({
    'from': account,
    'to': receiver,
    'value': 10000
  })

  // Add to Transactions Set
  transactions.push(transaction)
  sendTimes.push(date)

}

function getResult(transaction, blocks, timeDifference) {
    // Log Information
    let dur = (blocks[transaction.value.blockNumber].convertedTimestamp - transaction.sent) - timeDifference
    let result = {
      hash: transaction.value.transactionHash,
      blockNumber: transaction.value.blockNumber,
      sent: transaction.sent,
      miner: blocks[transaction.value.blockNumber].miner,
      mined: blocks[transaction.value.blockNumber].convertedTimestamp,
      duration: dur
    }
  return result;
}

function getTransactionResults(transactions, blocks, timeDifference) {
  // Create Promise
    let results = {}  // Results

    // Create Evaluation Input
    for (let i = 0; i < transactions.length; i++) {
      transaction = transactions[i];
      if (transaction.status == 'rejected') continue;
      let result = getResult(transaction, blocks, timeDifference);
      results[result.hash] = result;
    }

  return results;
}

async function getMinedBlocks(transactions) {
  p = new Promise(async function (resolve, reject) {
  let blocks = {};

  for (let i = 0; i < transactions.length; i++) {
    let trans = transactions[i];
    if (trans.status == 'rejected') continue;
    blockNumber = trans.value.blockNumber;
    if (blocks[blockNumber]) continue;
    let block = await web3.eth.getBlock(blockNumber);
    let newBlock = {
      miner: block.miner,
      blockNumber: blockNumber,
      timestamp: block.timestamp,
      convertedTimestamp: new Date(block.timestamp * 1000)
    }
    blocks[blockNumber] = newBlock;
  }

    resolve(blocks);
  });
  return p;
}

async function sendBatchedTransactions(account) {
  p = new Promise(async function (resolve, reject) {

  let transactions = []
  let sendTimes = []

  // Send Transactions in Batches
  let fulfilled = 0; let rejected = 0; let sent = 0;
  let returnedTransactions;
  console.log("SENDING TRANSACTIONS")
  while (fulfilled < NUM_TRANSACTIONS) {

    // Unlock Account
    await web3.eth.personal.unlockAccount(account, PASSWORD, 600)

    // Send Batch Size Amount of Transactions
    let determinedSize = (NUM_TRANSACTIONS - fulfilled) > BATCH_SIZE ? BATCH_SIZE : NUM_TRANSACTIONS - fulfilled; 
    for (let i = 0; i < determinedSize; i++) {
      let receiver = RECIPIENTS[0];
      let currentDate = new Date()
      sendTransaction(transactions, sendTimes, account, receiver, currentDate);
    }
    sent += determinedSize;
    console.log("Sent " + determinedSize + " transactions")

    // Check for Completed Transactions
    returnedTransactions = await Promise.allSettled(transactions)

    // Determine how many Rejected/Fulfilled
    rejected = 0; fulfilled = 0;
    for (let i = 0; i < returnedTransactions.length; i++) {
      if (returnedTransactions[i].status == 'rejected') rejected++;
      else fulfilled++;
    }
    console.log(" - Total Sent: " + sent)
    console.log(" - Total Rejected: " + rejected)
    console.log(" - Total Fulfilled: " + fulfilled)
    console.log(" - Total Remaining: " + (NUM_TRANSACTIONS - fulfilled))
  }
  console.log("")

  // Add Send Times
  for (let i = 0; i < returnedTransactions.length; i++) {  
    returnedTransactions[i].sent = sendTimes[i]
  }
  resolve(returnedTransactions);
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
  await web3.eth.personal.unlockAccount(account, PASSWORD, 600)
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
  let sendTimes = []

  // Send Transactions and Await Completion
  const completedTransactions = await sendBatchedTransactions(account);

  // Get Completed Blocks
  const completedBlocks = await getMinedBlocks(completedTransactions);

  // Compute Results
  const results = getTransactionResults(completedTransactions, completedBlocks, timeDifference);

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
  console.log("Number of Blocks Mined: " + Object.keys(completedBlocks).length)
  console.log("Total Duration (ms): " + totalDuration)
  console.log("Duration per Transaction (ms): " + (totalDuration / NUM_TRANSACTIONS))
  console.log("")

  // Print Pool Evaluation Results
  console.log("POOL-SPECIFIC PERFORMANCE EVALUATION")
  for (const pool in poolResults) {
    console.log("Pool " + POOLS[pool].name + " Results")
    console.log(" - Number of Miners: " + POOLS[pool].size)
    console.log(" - Transaction Count: " + poolResults[pool].transactionCount)
    console.log(" - Transaction Percentage: " + (poolResults[pool].transactionCount / NUM_TRANSACTIONS * 100) + "%")
    console.log(" - Average Transaction Duration (ms): " + (poolResults[pool].duration / poolResults[pool].transactionCount))
  }

}

// Call Main Function
main();


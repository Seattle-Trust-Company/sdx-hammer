
// Imports
const Web3 = require('web3');

// Set-up Web3
let web3 = new Web3(Web3.givenProvider || "ws://localhost:8000");

let miningAddresses = [
  "enode:27932..."
]

// Connect to Miners
for addr in miningAddresses {
  web3.admin.addPeer(addr)
}

// Send a shit ton of transactions
for () {

}

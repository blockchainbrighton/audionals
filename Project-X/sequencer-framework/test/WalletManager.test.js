module.exports = async function ({ assert }) {
  const WalletManager = require('../src/web3/WalletManager');
  const wallet = new WalletManager();
  const key = wallet.createKey();
  assert(key.startsWith('key-'), 'createKey should return a key id');
  const address = wallet.getAddress();
  assert(address.startsWith('address-'), 'getAddress should return an address');
  const txId = await wallet.inscribe(Buffer.from([1, 2]), 'application/octet-stream');
  assert(txId.startsWith('txid-'), 'inscribe should return a transaction id');
  const sig = wallet.signTransaction('tx-data');
  assert(sig.startsWith('signature-'), 'signTransaction should return a signature');
};
const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

const network = "https://api.devnet.solana.com";

// Create a wallet
async function createWallet() {
  const connection = new Connection(network, 'confirmed');
  const keypair = Keypair.generate();
  
  // Save wallet information to a file
  const walletInfo = {
    privateKey: [...keypair.secretKey],
    publicKey: keypair.publicKey.toBase58(),
    balance: 0
  };
  fs.writeFileSync('wallet.json', JSON.stringify(walletInfo, null, 2));
  
  console.log('Wallet created, and information saved to "wallet.json" file.');
}

// Airdrop SOL tokens
async function airdrop(amount = 1) {
  const connection = new Connection(network, 'confirmed');
  const walletInfo = JSON.parse(fs.readFileSync('wallet.json', 'utf-8'));
  const publicKey = new PublicKey(walletInfo.publicKey);

  try {
    // Request an airdrop
    await connection.requestAirdrop(publicKey, amount * 10 ** 9); // SOL has nine decimals, in lamports
    console.log(`${amount} SOL airdrop successful.`);
  } catch (error) {
    if (error.message.includes('Too Many Requests')) {
      console.log(`Airdrop failed: Rate limit exceeded. Retrying after delay...`);
      const retryDelay = Math.pow(2, 1) * 1000; // Exponential backoff with initial delay of 1000ms
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      await airdrop(amount); // Retry airdrop
    } else {
      console.error(`Airdrop failed: ${error.message}`);
    }
  }
}

// Check wallet balance
async function checkBalance() {
  const connection = new Connection(network, 'confirmed');
  const walletInfo = JSON.parse(fs.readFileSync('wallet.json', 'utf-8'));
  const publicKey = new PublicKey(walletInfo.publicKey);
  
  // Check wallet balance
  const balance = await connection.getBalance(publicKey);
  console.log(`Wallet balance: ${balance / 10 ** 9} SOL`);
}

// Transfer SOL tokens
async function transfer(otherPublicKey, amount) {
  const connection = new Connection(network, 'confirmed');
  const walletInfo = JSON.parse(fs.readFileSync('wallet.json', 'utf-8'));
  const fromPublicKey = new PublicKey(walletInfo.publicKey);
  const fromKeypair = Keypair.fromSecretKey(Uint8Array.from(walletInfo.privateKey));
  const toPublicKey = new PublicKey(otherPublicKey.trim()); // Trim any whitespace from the input

  try {
    // Fetch the recent blockhash
    const recentBlockhash = await connection.getRecentBlockhash();

    // Create a transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromPublicKey,
        toPubkey: toPublicKey,
        lamports: amount * 10 ** 9,
      })
    );

    // Sign the transaction with the recent blockhash
    transaction.recentBlockhash = recentBlockhash.blockhash;
    transaction.sign(fromKeypair);

    // Send the transaction
    const signature = await connection.sendTransaction(transaction, [fromKeypair]);
    console.log(`Transfer successful. Transaction signature: ${signature}`);
  } catch (error) {
    console.error(`Transfer failed: ${error.message}`);
    console.error('Transaction logs:', error.logs);
  }
}


createWallet(); // Create a wallet
airdrop(2); // Airdrop tokens (default is 1 SOL)
checkBalance(); // Check wallet balance
transfer('5vxsN5T7YfByi8E8yp5wB5HJ1xcwzYKHyq41utZvaaP5', 1);

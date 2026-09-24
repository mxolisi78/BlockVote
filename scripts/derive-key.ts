import { HDNodeWallet, Mnemonic } from "ethers";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Paste your 12-word seed phrase: ", (phrase) => {
  const mnemonic = Mnemonic.fromPhrase(phrase.trim());

  console.log("\nAccount index → address and private key:\n");

  // MetaMask uses m/44'/60'/0'/0/<index>
  for (let i = 0; i < 5; i++) {
    const path = `m/44'/60'/0'/0/${i}`;
    const wallet = HDNodeWallet.fromMnemonic(mnemonic, path);
    console.log(`[${i}] ${wallet.address}`);
    console.log(`    private: ${wallet.privateKey}\n`);
  }

  rl.close();
});
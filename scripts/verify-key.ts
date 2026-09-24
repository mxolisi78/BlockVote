import { Wallet } from "ethers";

// Paste the private key here to test
const privateKey = "0xa4e405ee7c14b1f3726cd144ed18905b1a2bd0f8f175482d2230c049818e1398";

const wallet = new Wallet(privateKey);
console.log("Address derived from key:", wallet.address);
console.log("Expected address:       0x9aDcEdA839B11dc336fb65102F30E7f0f74C5179");
console.log("Match:", wallet.address.toLowerCase() === "0x9aDcEdA839B11dc336fb65102F30E7f0f74C5179".toLowerCase());
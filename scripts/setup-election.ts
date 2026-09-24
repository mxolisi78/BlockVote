import hre from "hardhat";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Account #1 — the MetaMask voter
const VOTER1_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

async function main() {
  const { viem } = await hre.network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  const admin = walletClients[0];

  const asAdmin = await viem.getContractAt("BlockVote", CONTRACT_ADDRESS, {
    client: { wallet: admin },
  });

  console.log("\n══════════════════════════════════════════");
  console.log("  BLOCKVOTE — SETUP FOR FRONTEND TESTING");
  console.log("══════════════════════════════════════════\n");

  // 1. Add candidates
  console.log("Adding candidates...");
  for (const name of ["Alice Johnson", "Bob Smith", "Carol White"]) {
    const hash = await asAdmin.write.addCandidate([name]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✔ ${name}`);
  }

  // 2. Register Account #1 (the MetaMask wallet)
  console.log("\nRegistering MetaMask voter...");
  {
    const hash = await asAdmin.write.registerVoter([VOTER1_ADDRESS]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✔ ${VOTER1_ADDRESS}`);
  }

  // 3. Start election — DO NOT END IT
  console.log("\nStarting election...");
  {
    const hash = await asAdmin.write.startElection();
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✔ Election is LIVE`);
  }

  // Confirm state
  const started = await asAdmin.read.electionStarted();
  const ended = await asAdmin.read.electionEnded();
  const count = await asAdmin.read.candidateCount();

  console.log("\n─── Election State ───");
  console.log(`  Candidates : ${count}`);
  console.log(`  Started    : ${started}`);
  console.log(`  Ended      : ${ended}`);
  console.log(`  Voters Registered: 1`);
  console.log("\nReady to test the frontend! 🚀\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
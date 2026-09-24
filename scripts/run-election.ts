import hre from "hardhat";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Well-known Hardhat test accounts
const VOTER1_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const VOTER2_PRIVATE_KEY =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

const VOTER1_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const VOTER2_ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

/**
 * Extract a clean revert reason from a viem/hardhat error.
 * viem stores the useful info in different places depending on
 * which layer throws, so we check several and pick the best one.
 */
function getRevertReason(error: any): string {
  // viem puts the on-chain reason here when a contract call reverts
  if (error?.cause?.reason) return error.cause.reason;
  if (error?.reason) return error.reason;

  // hardhat-viem sometimes puts it in metaMessages
  if (Array.isArray(error?.metaMessages) && error.metaMessages.length > 0) {
    const joined = error.metaMessages.join(" ");
    const match = joined.match(/reverted with the following reason:\s*(.+)/i);
    if (match) return match[1].trim();
    return error.metaMessages[error.metaMessages.length - 1];
  }

  // Fall back: search the whole message for "reverted with reason"
  const raw = error?.details || error?.shortMessage || error?.message || String(error);
  const match = raw.match(/reverted with the following reason:\s*(.+)/i);
  if (match) return match[1].trim();

  return raw.split("\n")[0];
}

async function main() {
  const { viem } = await hre.network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  const admin = walletClients[0];

  const { createWalletClient, http } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { hardhat } = await import("viem/chains");

  const voter1 = createWalletClient({
    account: privateKeyToAccount(VOTER1_PRIVATE_KEY as `0x${string}`),
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
  });

  const voter2 = createWalletClient({
    account: privateKeyToAccount(VOTER2_PRIVATE_KEY as `0x${string}`),
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
  });

  const asAdmin = await viem.getContractAt("BlockVote", CONTRACT_ADDRESS, {
    client: { wallet: admin },
  });

  const asVoter1 = await viem.getContractAt("BlockVote", CONTRACT_ADDRESS, {
    client: { wallet: voter1 },
  });

  const asVoter2 = await viem.getContractAt("BlockVote", CONTRACT_ADDRESS, {
    client: { wallet: voter2 },
  });

  const asRead = await viem.getContractAt("BlockVote", CONTRACT_ADDRESS);

  console.log("\n══════════════════════════════════════════");
  console.log("  BLOCKVOTE — RUNNING FULL ELECTION");
  console.log("══════════════════════════════════════════\n");

  // STEP 1 — Add candidates
  console.log("STEP 1 — Admin adds 3 candidates...");
  for (const name of ["Alice Johnson", "Bob Smith", "Carol White"]) {
    const hash = await asAdmin.write.addCandidate([name]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✔ Added candidate: ${name}  (tx: ${hash.slice(0, 12)}...)`);
  }

  // STEP 2 — Register voters
  console.log("\nSTEP 2 — Admin registers 2 voters...");
  for (const addr of [VOTER1_ADDRESS, VOTER2_ADDRESS]) {
    const hash = await asAdmin.write.registerVoter([addr]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✔ Registered: ${addr}  (tx: ${hash.slice(0, 12)}...)`);
  }

  // STEP 3 — Start election
  console.log("\nSTEP 3 — Admin starts the election...");
  {
    const hash = await asAdmin.write.startElection();
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✔ Election started  (tx: ${hash.slice(0, 12)}...)`);
  }

  // STEP 4 — Voter 1 votes
  console.log("\nSTEP 4 — Voter 1 votes for Candidate #1 (Alice)...");
  {
    const hash = await asVoter1.write.vote([1n]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✔ Vote recorded  (tx: ${hash.slice(0, 12)}...)`);
  }

  // STEP 5 — Voter 2 votes
  console.log("\nSTEP 5 — Voter 2 votes for Candidate #2 (Bob)...");
  {
    const hash = await asVoter2.write.vote([2n]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✔ Vote recorded  (tx: ${hash.slice(0, 12)}...)`);
  }

  // STEP 6 — Double vote should fail
  console.log("\nSTEP 6 — Voter 1 tries to vote AGAIN (should fail)...");
  try {
    const hash = await asVoter1.write.vote([3n]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✘ UNEXPECTED: the second vote went through!");
  } catch (error: any) {
    const reason = getRevertReason(error);
    console.log(`  ✔ Blocked as expected: "${reason}"`);
  }

  // STEP 7 — Read results
  console.log("\nSTEP 7 — Reading current results...");
  const candidateCount = await asRead.read.candidateCount();
  const totalVotes = await asRead.read.totalVotes();
  console.log(`  Total votes cast: ${totalVotes}`);

  for (let i = 1; i <= Number(candidateCount); i++) {
    const [id, name, votes] = await asRead.read.getCandidate([BigInt(i)]);
    console.log(`  #${id}  ${name.padEnd(20)}  ${votes} votes`);
  }

  // STEP 8 — End election
  console.log("\nSTEP 8 — Admin ends the election...");
  {
    const hash = await asAdmin.write.endElection();
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✔ Election ended  (tx: ${hash.slice(0, 12)}...)`);
  }

  // STEP 9 — Vote after end should fail
  console.log("\nSTEP 9 — A registered voter tries to vote AFTER end (should fail)...");
  try {
    const hash = await asVoter1.write.vote([1n]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✘ UNEXPECTED: voting worked after end!");
  } catch (error: any) {
    const reason = getRevertReason(error);
    console.log(`  ✔ Blocked as expected: "${reason}"`);
  }

  console.log("\n══════════════════════════════════════════");
  console.log("  ELECTION COMPLETE");
  console.log("══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
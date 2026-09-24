import hre from "hardhat";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  const { viem } = await hre.network.connect();

  const blockVote = await viem.getContractAt(
    "BlockVote",
    CONTRACT_ADDRESS
  );

  console.log("\n══════════════════════════════════════════");
  console.log("  BLOCKVOTE — CURRENT STATE");
  console.log("══════════════════════════════════════════\n");

  const electionName = await blockVote.read.electionName();
  const admin = await blockVote.read.admin();
  const electionStarted = await blockVote.read.electionStarted();
  const electionEnded = await blockVote.read.electionEnded();
  const candidateCount = await blockVote.read.candidateCount();
  const totalVotes = await blockVote.read.totalVotes();

  console.log(`  Election Name   : ${electionName}`);
  console.log(`  Admin           : ${admin}`);
  console.log(`  Started         : ${electionStarted}`);
  console.log(`  Ended           : ${electionEnded}`);
  console.log(`  Candidate Count : ${candidateCount}`);
  console.log(`  Total Votes     : ${totalVotes}`);

  console.log("\n  Candidates:");
  console.log("  ──────────────────────────────────────");

  const count = Number(candidateCount);
  if (count === 0) {
    console.log("  (no candidates yet)");
  } else {
    for (let i = 1; i <= count; i++) {
      const [id, name, voteCount] = await blockVote.read.getCandidate([
        BigInt(i),
      ]);
      console.log(`  #${id}  ${name.padEnd(20)}  ${voteCount} votes`);
    }
  }

  console.log("\n══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
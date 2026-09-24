import hre from "hardhat";
import { parseEther, formatEther, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// Deployer / admin key
const DEPLOYER_PRIVATE_KEY =
  "0xa4e405ee7c14b1f3726cd144ed18905b1a2bd0f8f175482d2230c049818e1398";

// Voter key (Hardhat Account #1)
const VOTER_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const CONTRACT_ADDRESS = "0x101b9a965c7a3de05f74b58ce3b3bc83c8c99ba7";
async function main() {
  const { viem } = await hre.network.connect();
  const publicClient = await viem.getPublicClient();

  const deployer = privateKeyToAccount(
    DEPLOYER_PRIVATE_KEY as `0x${string}`
  );
  const voter = privateKeyToAccount(VOTER_PRIVATE_KEY as `0x${string}`);

  console.log("\n══════════════════════════════════════════");
  console.log("  SEPOLIA VOTE — FULL SEQUENCE");
  console.log("══════════════════════════════════════════\n");

  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Voter:    ${voter.address}`);
  console.log(`  Contract: ${CONTRACT_ADDRESS}`);

  // 1. Fund the voter
  const voterBalanceBefore = await publicClient.getBalance({
    address: voter.address,
  });
  console.log(`\n  Voter balance: ${formatEther(voterBalanceBefore)} ETH`);

  if (voterBalanceBefore < parseEther("0.001")) {
    console.log("  → Funding voter with 0.005 ETH...");

    const deployerWallet = createWalletClient({
      account: deployer,
      chain: sepolia,
      transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
    });

    const fundHash = await deployerWallet.sendTransaction({
      to: voter.address,
      value: parseEther("0.005"),
      chain: sepolia,
      account: deployer,
    });

    console.log(`  Funding tx: ${fundHash}`);
    await publicClient.waitForTransactionReceipt({ hash: fundHash });
    console.log("  ✔ Voter funded");
  } else {
    console.log("  ✔ Voter already has enough ETH");
  }

  // 2. Cast the vote
  console.log("\n  → Casting vote for candidate #1 (Alice Johnson)...");

  const voterWallet = createWalletClient({
    account: voter,
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  });

  const { encodeFunctionData } = await import("viem");

  const voteData = encodeFunctionData({
    abi: (await import("../frontend/src/lib/contract-abi.json")).default,
    functionName: "vote",
    args: [1n],
  });

  const voteHash = await voterWallet.sendTransaction({
    to: CONTRACT_ADDRESS as `0x${string}`,
    data: voteData,
    chain: sepolia,
    account: voter,
  });

  console.log(`  Vote tx: ${voteHash}`);
  await publicClient.waitForTransactionReceipt({ hash: voteHash });

  console.log("  ✔ Vote confirmed");

  // 3. Verify
  const abi = (await import("../frontend/src/lib/contract-abi.json")).default;
  const [id, name, votes] = (await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: abi as any,
    functionName: "getCandidate",
    args: [1n],
  })) as [bigint, string, bigint];

  console.log(`\n  Candidate #${id}: ${name} — ${votes} votes`);

  console.log("\n══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
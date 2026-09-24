import hre from "hardhat";
import { parseEther, formatEther } from "viem";

const DEPLOYER_PRIVATE_KEY =
  "0xa4e405ee7c14b1f3726cd144ed18905b1a2bd0f8f175482d2230c049818e1398";

const VOTER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const AMOUNT = "0.005"; // ETH

async function main() {
  const { viem } = await hre.network.connect();
  const publicClient = await viem.getPublicClient();

  const { createWalletClient, http } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { sepolia } = await import("viem/chains");

  const deployer = privateKeyToAccount(
    DEPLOYER_PRIVATE_KEY as `0x${string}`
  );

  console.log("\n══════════════════════════════════════════");
  console.log("  SEND SEPOLIA ETH: DEPLOYER → VOTER");
  console.log("══════════════════════════════════════════\n");

  console.log(`  From:    ${deployer.address}`);
  console.log(`  To:      ${VOTER_ADDRESS}`);
  console.log(`  Amount:  ${AMOUNT} ETH`);

  const wallet = createWalletClient({
    account: deployer,
    chain: sepolia,
    transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  });

  const balanceBefore = await publicClient.getBalance({
    address: deployer.address,
  });
  console.log(`  Deployer balance before: ${formatEther(balanceBefore)} ETH`);

  const hash = await wallet.sendTransaction({
    to: VOTER_ADDRESS as `0x${string}`,
    value: parseEther(AMOUNT),
    chain: sepolia,
    account: deployer,
  });

  console.log(`\n  Transaction sent: ${hash}`);
  console.log("  Waiting for confirmation...\n");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log(`  ✔ Confirmed in block ${receipt.blockNumber}`);
  console.log(`  ✔ Status: ${receipt.status}`);

  const balanceAfter = await publicClient.getBalance({
    address: deployer.address,
  });
  console.log(`  Deployer balance after:  ${formatEther(balanceAfter)} ETH`);

  console.log("\n══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
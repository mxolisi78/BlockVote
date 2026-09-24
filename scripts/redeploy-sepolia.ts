import hre from "hardhat";
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  encodeAbiParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const DEPLOYER_PRIVATE_KEY =
  "0xa4e405ee7c14b1f3726cd144ed18905b1a2bd0f8f175482d2230c049818e1398";

const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

async function main() {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC),
  });

  const deployer = privateKeyToAccount(DEPLOYER_PRIVATE_KEY as `0x${string}`);
  const wallet = createWalletClient({
    account: deployer,
    chain: sepolia,
    transport: http(RPC),
  });

  console.log("\n══════════════════════════════════════════");
  console.log("  REDEPLOY BLOCKVOTE TO SEPOLIA");
  console.log("══════════════════════════════════════════\n");

  console.log(`  Deployer: ${deployer.address}`);

  // 1. Get the compiled artifact
  const artifact = await hre.artifacts.readArtifact("BlockVote");

  // 2. Build the deployment bytecode (contract bytecode + encoded constructor args)
  const encodedArgs = encodeAbiParameters(
    [{ type: "string" }],
    ["Student Council Election 2026"]
  );

  const deployData = (artifact.bytecode + encodedArgs.slice(2)) as `0x${string}`;

  console.log("\n  → Deploying new BlockVote contract...");

  const deployHash = await wallet.sendTransaction({
    data: deployData,
    chain: sepolia,
    account: deployer,
  });

  console.log(`  Deploy tx: ${deployHash}`);
  const deployReceipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
  });

  const contractAddress = deployReceipt.contractAddress;
  if (!contractAddress) throw new Error("No contract address in receipt");

  console.log(`  ✔ Contract deployed at ${contractAddress}`);

  // 3. Add candidates
  console.log("\n  → Adding candidates...");
  for (const name of ["Alice Johnson", "Bob Smith", "Carol White"]) {
    const data = encodeFunctionData({
      abi: artifact.abi,
      functionName: "addCandidate",
      args: [name],
    });
    const hash = await wallet.sendTransaction({
      to: contractAddress,
      data,
      chain: sepolia,
      account: deployer,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`     ✔ ${name}`);
  }

  // 4. Register the DEPLOYER as a voter
  console.log("\n  → Registering deployer as voter...");
  {
    const data = encodeFunctionData({
      abi: artifact.abi,
      functionName: "registerVoter",
      args: [deployer.address],
    });
    const hash = await wallet.sendTransaction({
      to: contractAddress,
      data,
      chain: sepolia,
      account: deployer,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`     ✔ ${deployer.address}`);
  }

  // 5. Start election
  console.log("\n  → Starting election...");
  {
    const data = encodeFunctionData({
      abi: artifact.abi,
      functionName: "startElection",
      args: [],
    });
    const hash = await wallet.sendTransaction({
      to: contractAddress,
      data,
      chain: sepolia,
      account: deployer,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`     ✔ Election is LIVE`);
  }

  // 6. Cast vote from deployer
  console.log("\n  → Casting vote from deployer for Alice...");
  {
    const data = encodeFunctionData({
      abi: artifact.abi,
      functionName: "vote",
      args: [1n],
    });
    const hash = await wallet.sendTransaction({
      to: contractAddress,
      data,
      chain: sepolia,
      account: deployer,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`     ✔ Vote cast`);
  }

  // 7. Read final results
  console.log("\n  → Reading results...");
  for (let i = 1; i <= 3; i++) {
    const [id, name, votes] = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "getCandidate",
      args: [BigInt(i)],
    })) as [bigint, string, bigint];
    console.log(`     #${id}  ${name.padEnd(20)}  ${votes} votes`);
  }

  console.log("\n══════════════════════════════════════════");
  console.log("  ✅ REDEPLOY COMPLETE");
  console.log("══════════════════════════════════════════");
  console.log(`\n  NEW CONTRACT ADDRESS:\n  ${contractAddress}\n`);
  console.log(`  Update your frontend to use this address.`);
  console.log("══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
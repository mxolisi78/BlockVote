import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type PublicClient,
} from "viem";
import { hardhat } from "viem/chains";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  HARDHAT_CHAIN_ID_HEX,
  HARDHAT_NETWORK_PARAMS,
} from "./contract";

// ---------- Public client (read-only) ----------

let publicClientInstance: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!publicClientInstance) {
    publicClientInstance = createPublicClient({
      chain: hardhat,
      transport: http("http://127.0.0.1:8545"),
    }) as PublicClient;
  }
  return publicClientInstance;
}

// ---------- Read helpers ----------

export async function readElectionName(): Promise<string> {
  return (await getPublicClient().readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "electionName",
  })) as string;
}

export async function readElectionState(): Promise<{
  started: boolean;
  ended: boolean;
  candidateCount: number;
  totalVotes: bigint;
}> {
  const client = getPublicClient();

  const [started, ended, candidateCount, totalVotes] = await Promise.all([
    client.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "electionStarted",
    }),
    client.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "electionEnded",
    }),
    client.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "candidateCount",
    }),
    client.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "totalVotes",
    }),
  ]);

  return {
    started: started as boolean,
    ended: ended as boolean,
    candidateCount: Number(candidateCount),
    totalVotes: totalVotes as bigint,
  };
}

export type Candidate = {
  id: bigint;
  name: string;
  voteCount: bigint;
};

export async function readCandidates(): Promise<Candidate[]> {
  const { candidateCount } = await readElectionState();
  const client = getPublicClient();

  const results: Candidate[] = [];

  for (let i = 1; i <= candidateCount; i++) {
    const [id, name, voteCount] = (await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "getCandidate",
      args: [BigInt(i)],
    })) as [bigint, string, bigint];

    results.push({ id, name, voteCount });
  }

  return results;
}

export async function readVoterStatus(address: Address): Promise<{
  registered: boolean;
  hasVoted: boolean;
}> {
  const [registered, hasVoted] = (await getPublicClient().readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "getVoterStatus",
    args: [address],
  })) as [boolean, boolean];

  return { registered, hasVoted };
}

// ---------- Wallet client (write) ----------

export function getWalletClient(address: Address) {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  return createWalletClient({
    account: address,
    chain: hardhat,
    transport: custom(window.ethereum),
  });
}

/**
 * Ensure MetaMask is on Hardhat Local. Add the chain if needed.
 */
export async function ensureHardhatNetwork(): Promise<void> {
  if (!window.ethereum) throw new Error("MetaMask not installed");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    if (err?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [HARDHAT_NETWORK_PARAMS],
      });
    } else {
      throw err;
    }
  }
}

/**
 * Cast a vote on-chain. Returns the transaction hash.
 */
export async function castVote(
  address: Address,
  candidateId: bigint
): Promise<`0x${string}`> {
  await ensureHardhatNetwork();

  const wallet = getWalletClient(address);

  const hash = await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "vote",
    args: [candidateId],
    chain: hardhat,
    account: address,
  });

  return hash;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
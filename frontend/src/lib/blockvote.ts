import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type PublicClient,
} from "viem";
import { sepolia } from "viem/chains";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  SEPOLIA_CHAIN_ID_HEX,
} from "./contract";

// ---------- Public client (read-only) ----------

let publicClientInstance: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!publicClientInstance) {
    publicClientInstance = createPublicClient({
      chain: sepolia,
      transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
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
    chain: sepolia,
    transport: custom(window.ethereum),
  });
}

/**
 * Ensure MetaMask is on Sepolia. If not, ask MetaMask to switch.
 */
export async function ensureSepoliaNetwork(): Promise<void> {
  if (!window.ethereum) throw new Error("MetaMask not installed");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    // 4902 = chain not added to MetaMask
    if (err?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: "Sepolia",
            nativeCurrency: {
              name: "SepoliaETH",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
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
  await ensureSepoliaNetwork();

  const wallet = getWalletClient(address);

  const hash = await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "vote",
    args: [candidateId],
    chain: sepolia,
    account: address,
  });

  return hash;
}

// ---------- Admin write helpers ----------

export async function adminAddCandidate(
  adminAddress: Address,
  name: string
): Promise<`0x${string}`> {
  await ensureSepoliaNetwork();
  const wallet = getWalletClient(adminAddress);
  return await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "addCandidate",
    args: [name],
    chain: sepolia,
    account: adminAddress,
  });
}

export async function adminRegisterVoter(
  adminAddress: Address,
  voter: Address
): Promise<`0x${string}`> {
  await ensureSepoliaNetwork();
  const wallet = getWalletClient(adminAddress);
  return await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "registerVoter",
    args: [voter],
    chain: sepolia,
    account: adminAddress,
  });
}

export async function adminStartElection(
  adminAddress: Address
): Promise<`0x${string}`> {
  await ensureSepoliaNetwork();
  const wallet = getWalletClient(adminAddress);
  return await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "startElection",
    args: [],
    chain: sepolia,
    account: adminAddress,
  });
}

export async function adminEndElection(
  adminAddress: Address
): Promise<`0x${string}`> {
  await ensureSepoliaNetwork();
  const wallet = getWalletClient(adminAddress);
  return await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "endElection",
    args: [],
    chain: sepolia,
    account: adminAddress,
  });
}

export async function readAdmin(): Promise<Address> {
  return (await getPublicClient().readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "admin",
  })) as Address;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
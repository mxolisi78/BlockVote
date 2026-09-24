import { HARDHAT_NETWORK_PARAMS, HARDHAT_CHAIN_ID_HEX } from "./contract";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function isMetaMaskInstalled(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

/**
 * Switch MetaMask to Hardhat Local. If the network is not known,
 * add it first.
 */
export async function switchToHardhatLocal(): Promise<void> {
  if (!window.ethereum) throw new Error("MetaMask not installed");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    // 4902 = chain not added to MetaMask
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
 * Connect MetaMask. Requests accounts and forces Hardhat Local.
 */
export async function connectWallet(): Promise<string> {
  if (!window.ethereum) throw new Error("MetaMask not installed");

  const accounts: string[] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts returned");
  }

  await switchToHardhatLocal();

  return accounts[0];
}

/**
 * Read the current connected account without prompting.
 */
export async function getCurrentAccount(): Promise<string | null> {
  if (!window.ethereum) return null;
  const accounts: string[] = await window.ethereum.request({
    method: "eth_accounts",
  });
  return accounts[0] ?? null;
}

/**
 * Read the ETH balance of an address via MetaMask's provider.
 */
export async function getBalance(address: string): Promise<string> {
  if (!window.ethereum) return "0";

  const weiHex: string = await window.ethereum.request({
    method: "eth_getBalance",
    params: [address, "latest"],
  });

  const wei = BigInt(weiHex);
  const eth = Number(wei) / 1e18;
  return eth.toFixed(4);
}
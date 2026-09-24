import abi from "./contract-abi.json";

// Local Hardhat:   0x5FbDB2315678afecb367f032d93F642f64180aa3
// Sepolia:         0xb12166Fe060BAf4eBB17462091c6eFed7cA1ADFF
export const CONTRACT_ADDRESS =
  "0x101b9a965c7a3de05f74b58ce3b3bc83c8c99ba7" as `0x${string}`;

export const CONTRACT_ABI = abi as any;

// Hardhat Local (chain 31337) — kept for reference
export const HARDHAT_CHAIN_ID_HEX = "0x7a69";

// Sepolia (chain 11155111)
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

// Legacy export — kept so older files don't break
export const HARDHAT_NETWORK_PARAMS = {
  chainId: HARDHAT_CHAIN_ID_HEX,
  chainName: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["http://127.0.0.1:8545"],
};
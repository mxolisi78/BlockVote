import abi from "./contract-abi.json";

export const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`;

export const CONTRACT_ABI = abi as any;

export const HARDHAT_CHAIN_ID_HEX = "0x7a69"; // 31337

export const HARDHAT_NETWORK_PARAMS = {
  chainId: HARDHAT_CHAIN_ID_HEX,
  chainName: "Hardhat Local",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["http://127.0.0.1:8545"],
};
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BlockVoteModule = buildModule("BlockVoteModule", (m) => {
  const electionName = m.getParameter(
    "electionName",
    "Student Council Election 2026"
  );

  const blockVote = m.contract("BlockVote", [electionName]);

  return { blockVote };
});

export default BlockVoteModule;
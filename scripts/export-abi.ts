import hre from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

async function main() {
  const artifact = await hre.artifacts.readArtifact("BlockVote");

  const outDir = join(process.cwd(), "frontend", "src", "lib");
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, "contract-abi.json");
  writeFileSync(outPath, JSON.stringify(artifact.abi, null, 2));

  console.log(`✅ ABI written to ${outPath}`);
  console.log(`   ${artifact.abi.length} entries`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
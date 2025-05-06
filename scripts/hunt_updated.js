const hre = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("Hunting with Hunter NFT from account:", user.address);

  // Updated contract addresses from the recent deployment
  const gameAddress = "0xE54f03E9B70Ba772b3a476c12E0C1F2e7e9b967a";
  const mimoAddress = "0x238e3655475A7a351eBbe9A2aFeD61f97cc3eB92";
  
  // Get contract instances
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  const mimoToken = await ethers.getContractAt("MiMoGaMe", mimoAddress);
  
  // Check Hunter balance
  const hunterBalance = await gameEcosystem.balanceOf(user.address);
  console.log(`You own ${hunterBalance} Hunter NFT(s)`);
  
  if (hunterBalance === 0n) {
    console.error("You don't own any Hunter NFTs to hunt with!");
    return;
  }
  
  // Get the first Hunter NFT
  const hunterId = await gameEcosystem.tokenOfOwnerByIndex(user.address, 0);
  console.log(`Using Hunter NFT with Token ID: ${hunterId}`);
  
  // Check Hunter stats before hunting
  const beforeStats = await gameEcosystem.getHunterStats(hunterId);
  console.log(`Hunter Stats Before Hunting:
  - Power: ${ethers.formatEther(beforeStats[3])}
  - Total Hunted: ${ethers.formatEther(beforeStats[7])}
  - Active: ${await gameEcosystem.isHunterActive(hunterId)}`);
  
  // Check if hunter can hunt
  const canHuntResult = await gameEcosystem.canHunt(hunterId);
  if (!canHuntResult[0]) {
    console.error(`Cannot hunt: ${canHuntResult[1]}`);
    return;
  }
  
  // Check MiMo balance before hunting
  const mimoBalanceBefore = await mimoToken.balanceOf(user.address);
  console.log(`MiMo balance before hunt: ${ethers.formatEther(mimoBalanceBefore)} MiMo`);
  
  // Approve MiMo tokens to be hunted from user
  const approvalAmount = ethers.parseEther("100"); // Enough to cover potential hunt amount
  console.log(`Approving MiMo tokens for hunting...`);
  const approvalTx = await mimoToken.approve(gameAddress, approvalAmount);
  await approvalTx.wait();
  console.log("Approval confirmed");
  
  // Hunt from self
  console.log("Hunting from self...");
  const huntTx = await gameEcosystem.hunt(hunterId, user.address);
  await huntTx.wait();
  
  // Check Hunter stats after hunting
  const afterStats = await gameEcosystem.getHunterStats(hunterId);
  console.log(`Hunter Stats After Hunting:
  - Power: ${ethers.formatEther(afterStats[3])}
  - Total Hunted: ${ethers.formatEther(afterStats[7])}
  - Active: ${await gameEcosystem.isHunterActive(hunterId)}`);
  
  // Check MiMo balance after hunting
  const mimoBalanceAfter = await mimoToken.balanceOf(user.address);
  const mimoChange = mimoBalanceAfter - mimoBalanceBefore;
  console.log(`MiMo balance after hunt: ${ethers.formatEther(mimoBalanceAfter)} MiMo`);
  console.log(`MiMo change: ${ethers.formatEther(mimoChange)} MiMo`);
  
  // Try hunting from a different target
  console.log("\nTrying to hunt from ecosystem contract...");
  try {
    // Before we try to hunt, check if it's allowed
    const canHuntResult = await gameEcosystem.canHunt(hunterId);
    if (!canHuntResult[0]) {
      console.log(`Cannot hunt again: ${canHuntResult[1]}`);
    } else {
      const huntTx = await gameEcosystem.hunt(hunterId, gameAddress);
      await huntTx.wait();
      console.log("Hunt from ecosystem contract succeeded");
    }
  } catch (error) {
    console.log("Hunt from ecosystem contract failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
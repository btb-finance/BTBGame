const hre = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("Feeding Hunter with account:", user.address);

  // Game ecosystem contract address
  const gameAddress = "0xA44906a6c5A0fC974a73C76F6E8B8a5C066413B7";
  
  // Get contract instance
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  
  // Check Hunter NFT balance
  const hunterBalance = await gameEcosystem.balanceOf(user.address);
  console.log(`You own ${hunterBalance} Hunter NFT(s)`);
  
  if (hunterBalance === 0n) {
    console.error("You don't own any Hunter NFTs to feed!");
    return;
  }
  
  // Get the user's first token ID
  const tokenId = await gameEcosystem.tokenOfOwnerByIndex(user.address, 0);
  console.log(`Feeding Hunter with Token ID: ${tokenId}`);
  
  // Get Hunter stats before feeding
  console.log("Hunter stats before feeding:");
  const statsBefore = await gameEcosystem.getHunterStats(tokenId);
  console.log(`- Power: ${ethers.formatEther(statsBefore[3])}
- Last Feed Time: ${new Date(Number(statsBefore[1]) * 1000).toLocaleString()}
- Missed Feedings: ${statsBefore[4]}
- In Hibernation: ${statsBefore[5]}`);
  
  // Feed the Hunter
  console.log("Feeding Hunter...");
  try {
    const feedTx = await gameEcosystem.feedHunter(tokenId);
    await feedTx.wait();
    console.log("Hunter fed successfully!");
    
    // Get Hunter stats after feeding
    console.log("Hunter stats after feeding:");
    const statsAfter = await gameEcosystem.getHunterStats(tokenId);
    console.log(`- Power: ${ethers.formatEther(statsAfter[3])}
- Last Feed Time: ${new Date(Number(statsAfter[1]) * 1000).toLocaleString()}
- Missed Feedings: ${statsAfter[4]}
- In Hibernation: ${statsAfter[5]}`);
    
    // Calculate power increase
    const powerBefore = statsBefore[3];
    const powerAfter = statsAfter[3];
    if (powerAfter > powerBefore) {
      const increase = powerAfter - powerBefore;
      console.log(`Power increased by ${ethers.formatEther(increase)} (${(Number(increase) * 100 / Number(powerBefore)).toFixed(2)}%)`);
    } else {
      console.log("Power did not increase. This might be because the hunter was hibernating, in recovery, or already fed today.");
    }
  } catch (error) {
    console.error("Failed to feed Hunter:", error.message);
    
    // Try to get more info on why it failed
    const canFeed = await gameEcosystem.canHunt(tokenId);
    console.log("Can hunt status:", canFeed);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
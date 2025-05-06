const hre = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("Hunting with account:", user.address);

  // Game ecosystem contract address
  const gameAddress = "0xA44906a6c5A0fC974a73C76F6E8B8a5C066413B7";
  
  // Get contract instance
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  
  // Check Hunter NFT balance
  const hunterBalance = await gameEcosystem.balanceOf(user.address);
  console.log(`You own ${hunterBalance} Hunter NFT(s)`);
  
  if (hunterBalance === 0n) {
    console.error("You don't own any Hunter NFTs to hunt with!");
    return;
  }
  
  // Get the user's first token ID
  const tokenId = await gameEcosystem.tokenOfOwnerByIndex(user.address, 0);
  console.log(`Hunting with Hunter (Token ID: ${tokenId})`);
  
  // Check if can hunt
  const [canHunt, reason] = await gameEcosystem.canHunt(tokenId);
  console.log(`Can hunt: ${canHunt} (${reason})`);
  
  if (!canHunt) {
    console.error(`Cannot hunt: ${reason}`);
    return;
  }
  
  // Get MiMo balance before hunting
  const mimoBalanceBefore = await gameEcosystem.mimoBalanceOf(user.address);
  console.log(`MiMo balance before hunting: ${ethers.formatEther(mimoBalanceBefore)} MiMo`);
  
  // Get Hunter stats before hunting
  const statsBefore = await gameEcosystem.getHunterStats(tokenId);
  console.log(`Hunter stats before hunting:
- Power: ${ethers.formatEther(statsBefore[3])}
- Last Hunt Time: ${new Date(Number(statsBefore[2]) * 1000).toLocaleString()}
- Total Hunted: ${ethers.formatEther(statsBefore[7])}`);

  // Hunt
  console.log("Hunting...");
  try {
    const huntTx = await gameEcosystem.hunt(tokenId);
    const receipt = await huntTx.wait();
    console.log("Hunt successful!");
    
    // Look for HunterHunted event
    const hunterHuntedEvents = receipt.logs
      .filter(log => log.topics[0] === ethers.id("HunterHunted(uint256,uint256,uint256,uint256,uint256)"))
      .map(log => {
        const decoded = gameEcosystem.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        return decoded.args;
      });
    
    if (hunterHuntedEvents.length > 0) {
      const event = hunterHuntedEvents[0];
      console.log(`Hunt results:
- Total hunted: ${ethers.formatEther(event[1])} MiMo
- To owner: ${ethers.formatEther(event[2])} MiMo
- Burned: ${ethers.formatEther(event[3])} MiMo
- To liquidity: ${ethers.formatEther(event[4])} MiMo`);
    }
    
    // Get MiMo balance after hunting
    const mimoBalanceAfter = await gameEcosystem.mimoBalanceOf(user.address);
    console.log(`MiMo balance after hunting: ${ethers.formatEther(mimoBalanceAfter)} MiMo`);
    
    if (mimoBalanceAfter > mimoBalanceBefore) {
      const increase = mimoBalanceAfter - mimoBalanceBefore;
      console.log(`Earned ${ethers.formatEther(increase)} MiMo from hunting!`);
    }
    
    // Get updated Hunter stats
    const statsAfter = await gameEcosystem.getHunterStats(tokenId);
    console.log(`Updated Hunter stats:
- Power: ${ethers.formatEther(statsAfter[3])}
- Last Hunt Time: ${new Date(Number(statsAfter[2]) * 1000).toLocaleString()}
- Total Hunted: ${ethers.formatEther(statsAfter[7])}`);
  } catch (error) {
    console.error("Failed to hunt:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const hre = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("Checking MiMo balance for:", user.address);

  // Game ecosystem contract address
  const gameAddress = "0xA44906a6c5A0fC974a73C76F6E8B8a5C066413B7";
  
  // Get contract instance
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  
  // Check MiMo balance
  const mimoBalance = await gameEcosystem.mimoBalanceOf(user.address);
  console.log(`MiMo balance: ${ethers.formatEther(mimoBalance)} MiMo`);
  
  // Check Hunter NFT balance
  const hunterBalance = await gameEcosystem.balanceOf(user.address);
  console.log(`Hunter NFT balance: ${hunterBalance}`);
  
  // Show Hunter information if any
  if (hunterBalance > 0n) {
    for (let i = 0; i < Number(hunterBalance); i++) {
      const tokenId = await gameEcosystem.tokenOfOwnerByIndex(user.address, i);
      console.log(`\nHunter #${i+1}: Token ID ${tokenId}`);
      
      // Get Hunter stats
      const stats = await gameEcosystem.getHunterStats(tokenId);
      console.log(`Hunter Stats:
- Creation Time: ${new Date(Number(stats[0]) * 1000).toLocaleString()}
- Last Feed Time: ${new Date(Number(stats[1]) * 1000).toLocaleString()}
- Last Hunt Time: ${new Date(Number(stats[2]) * 1000).toLocaleString()}
- Power: ${ethers.formatEther(stats[3])}
- Missed Feedings: ${stats[4]}
- In Hibernation: ${stats[5]}
- Total Hunted: ${ethers.formatEther(stats[7])}
- Days Remaining: ${stats[8]}`);
      
      // Check if Hunter can hunt
      const [canHunt, reason] = await gameEcosystem.canHunt(tokenId);
      console.log(`Can Hunt: ${canHunt} (${reason})`);
    }
  }
  
  // Check Bear NFT balance
  const bearNFT = await ethers.getContractAt("BearNFT", await gameEcosystem.bearNFT());
  const bearBalance = await bearNFT.balanceOf(user.address);
  console.log(`\nBear NFT balance: ${bearBalance}`);
  
  // Show Bear NFTs if any
  if (bearBalance > 0n) {
    for (let i = 0; i < Number(bearBalance); i++) {
      const tokenId = await bearNFT.tokenOfOwnerByIndex(user.address, i);
      console.log(`Bear NFT #${i+1}: Token ID ${tokenId}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
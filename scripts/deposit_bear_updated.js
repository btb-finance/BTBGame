const hre = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("Depositing Bear NFT with account:", user.address);

  // Updated contract addresses from the recent deployment
  const nftAddress = "0x20Fcc806EA429fA6136D20F1F16cF1dE09b92b86";
  const gameAddress = "0xE54f03E9B70Ba772b3a476c12E0C1F2e7e9b967a";
  const mimoAddress = "0x238e3655475A7a351eBbe9A2aFeD61f97cc3eB92";
  
  // Get contract instances
  const bearNFT = await ethers.getContractAt("BearNFT", nftAddress);
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  const mimoToken = await ethers.getContractAt("MiMoGaMe", mimoAddress);
  
  // Check NFT balance
  const nftBalance = await bearNFT.balanceOf(user.address);
  console.log(`You own ${nftBalance} Bear NFT(s)`);
  
  if (nftBalance === 0n) {
    console.error("You don't own any Bear NFTs to deposit!");
    return;
  }
  
  // Get the user's first token ID
  const tokenId = await bearNFT.tokenOfOwnerByIndex(user.address, 0);
  console.log(`Depositing Bear NFT with Token ID: ${tokenId}`);
  
  // Approve the game contract to transfer the NFT
  console.log("Approving NFT transfer...");
  const approvalTx = await bearNFT.approve(gameAddress, tokenId);
  await approvalTx.wait();
  console.log("Approval confirmed");
  
  // Deposit the NFT
  console.log("Depositing Bear NFT...");
  const depositTx = await gameEcosystem.depositBear(tokenId);
  const receipt = await depositTx.wait();
  
  // Check Hunter NFT balance
  const hunterBalance = await gameEcosystem.balanceOf(user.address);
  console.log(`Deposit successful! You now own ${hunterBalance} Hunter NFT(s)`);
  
  // Check MiMo balance directly from the MiMo token contract
  const mimoBalance = await mimoToken.balanceOf(user.address);
  console.log(`Your MiMo balance: ${ethers.formatEther(mimoBalance)} MiMo`);
  
  // Show Hunter token IDs
  for (let i = 0; i < Number(hunterBalance); i++) {
    const hunterId = await gameEcosystem.tokenOfOwnerByIndex(user.address, i);
    console.log(`Hunter #${i+1}: Token ID ${hunterId}`);
    
    // Get Hunter stats
    const stats = await gameEcosystem.getHunterStats(hunterId);
    console.log(`Hunter Stats:
    - Creation Time: ${new Date(Number(stats[0]) * 1000).toLocaleString()}
    - Last Feed Time: ${new Date(Number(stats[1]) * 1000).toLocaleString()}
    - Last Hunt Time: ${new Date(Number(stats[2]) * 1000).toLocaleString()}
    - Power: ${ethers.formatEther(stats[3])}
    - Missed Feedings: ${stats[4]}
    - In Hibernation: ${stats[5]}
    - Days Remaining: ${stats[8]}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const hre = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("Batch depositing Bear NFTs with account:", user.address);

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
  
  // We'll deposit 3 NFTs
  const numToDeposit = Math.min(3, Number(nftBalance));
  const tokenIds = [];
  
  // Collect token IDs to deposit
  for (let i = 0; i < numToDeposit; i++) {
    const tokenId = await bearNFT.tokenOfOwnerByIndex(user.address, i);
    tokenIds.push(tokenId);
    console.log(`Will deposit Bear NFT with Token ID: ${tokenId}`);
  }
  
  // Check initial MiMo balance
  const initialMimoBalance = await mimoToken.balanceOf(user.address);
  console.log(`Initial MiMo balance: ${ethers.formatEther(initialMimoBalance)} MiMo`);
  
  // Approve and deposit each NFT
  for (let i = 0; i < tokenIds.length; i++) {
    // Approve the game contract to transfer the NFT
    console.log(`Approving NFT transfer for token ID ${tokenIds[i]}...`);
    const approvalTx = await bearNFT.approve(gameAddress, tokenIds[i]);
    await approvalTx.wait();
    console.log("Approval confirmed");
    
    // Deposit the NFT
    console.log(`Depositing Bear NFT with token ID ${tokenIds[i]}...`);
    const depositTx = await gameEcosystem.depositBear(tokenIds[i]);
    await depositTx.wait();
    console.log(`Deposit of token ID ${tokenIds[i]} successful!`);
  }
  
  // Check final Hunter NFT balance
  const hunterBalance = await gameEcosystem.balanceOf(user.address);
  console.log(`You now own ${hunterBalance} Hunter NFT(s)`);
  
  // Check final MiMo balance
  const finalMimoBalance = await mimoToken.balanceOf(user.address);
  console.log(`Final MiMo balance: ${ethers.formatEther(finalMimoBalance)} MiMo`);
  console.log(`MiMo earned: ${ethers.formatEther(finalMimoBalance - initialMimoBalance)} MiMo`);
  
  // Show Hunter token IDs and stats
  for (let i = 0; i < Number(hunterBalance); i++) {
    const hunterId = await gameEcosystem.tokenOfOwnerByIndex(user.address, i);
    console.log(`Hunter #${i+1}: Token ID ${hunterId}`);
    
    // Get Hunter stats
    const stats = await gameEcosystem.getHunterStats(hunterId);
    console.log(`Hunter Stats:
    - Creation Time: ${new Date(Number(stats[0]) * 1000).toLocaleString()}
    - Power: ${ethers.formatEther(stats[3])}
    - Days Remaining: ${stats[8]}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
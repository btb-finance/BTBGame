const hre = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("Depositing Bear NFT with account:", user.address);

  // Contract addresses
  const nftAddress = "0x4AF11c8ea29039b9F169DBB08Bf6B794EB45BB7a";
  const gameAddress = "0xA44906a6c5A0fC974a73C76F6E8B8a5C066413B7";
  
  // Get contract instances
  const bearNFT = await ethers.getContractAt("BearNFT", nftAddress);
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  
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
  
  // Check MiMo balance
  const mimoBalance = await gameEcosystem.mimoBalanceOf(user.address);
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
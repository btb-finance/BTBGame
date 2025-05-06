const hre = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("Redeeming Bear NFT with account:", user.address);

  // Game ecosystem contract address
  const gameAddress = "0xA44906a6c5A0fC974a73C76F6E8B8a5C066413B7";
  
  // Get contract instance
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  
  // Check MiMo balance
  const mimoBalance = await gameEcosystem.mimoBalanceOf(user.address);
  console.log(`Your MiMo balance: ${ethers.formatEther(mimoBalance)} MiMo`);
  
  // Check redemption cost - base amount + fee (10%)
  const REDEMPTION_MIMO_AMOUNT = ethers.parseEther("1000000"); // 1M MiMo tokens
  const REDEMPTION_FEE_PERCENTAGE = 10; // 10%
  const feeAmount = (REDEMPTION_MIMO_AMOUNT * BigInt(REDEMPTION_FEE_PERCENTAGE)) / 100n;
  const totalCost = REDEMPTION_MIMO_AMOUNT + feeAmount;
  
  console.log(`Cost to redeem a Bear NFT: ${ethers.formatEther(totalCost)} MiMo tokens`);
  console.log(`- Base cost: ${ethers.formatEther(REDEMPTION_MIMO_AMOUNT)} MiMo`);
  console.log(`- Fee (${REDEMPTION_FEE_PERCENTAGE}%): ${ethers.formatEther(feeAmount)} MiMo`);
  
  // Check if user has enough MiMo tokens
  if (mimoBalance < totalCost) {
    console.error(`Insufficient MiMo balance! You need ${ethers.formatEther(totalCost)} MiMo tokens.`);
    return;
  }
  
  // Check if redemption is paused
  const isRedemptionPaused = await gameEcosystem.redemptionPaused();
  if (isRedemptionPaused) {
    console.error("Bear NFT redemption is currently paused.");
    return;
  }
  
  // Check if the contract has any Bear NFTs available
  const bearNFT = await ethers.getContractAt("BearNFT", await gameEcosystem.bearNFT());
  let contractBalance = await bearNFT.balanceOf(gameAddress);
  console.log(`Contract has ${contractBalance} Bear NFTs available for redemption.`);
  
  if (contractBalance === 0n) {
    console.log("No Bear NFTs available for redemption. Minting one to the contract...");
    
    // Check if we're the owner of the NFT contract
    const nftOwner = await bearNFT.owner();
    if (nftOwner.toLowerCase() === user.address.toLowerCase()) {
      // Mint a new Bear NFT to the game contract
      console.log("Minting a Bear NFT to the game contract...");
      const mintTx = await bearNFT.safeMint(gameAddress);
      await mintTx.wait();
      
      // Check new contract balance
      contractBalance = await bearNFT.balanceOf(gameAddress);
      console.log(`Contract now has ${contractBalance} Bear NFTs available for redemption.`);
    } else {
      console.error(`Cannot mint Bear NFT. Current NFT owner is ${nftOwner}, you are ${user.address}`);
      return;
    }
  }
  
  // Attempt to redeem a Bear NFT
  console.log("Redeeming a Bear NFT...");
  try {
    const tx = await gameEcosystem.redeemBear();
    await tx.wait();
    console.log("Redemption successful!");
    
    // Check new MiMo balance
    const newMimoBalance = await gameEcosystem.mimoBalanceOf(user.address);
    console.log(`Your new MiMo balance: ${ethers.formatEther(newMimoBalance)} MiMo`);
    
    // Check Bear NFT balance
    const bearBalance = await bearNFT.balanceOf(user.address);
    console.log(`Your Bear NFT balance: ${bearBalance}`);
    
    // Show Bear NFT IDs
    if (bearBalance > 0n) {
      for (let i = 0; i < Number(bearBalance); i++) {
        const tokenId = await bearNFT.tokenOfOwnerByIndex(user.address, i);
        console.log(`Bear NFT #${i+1}: Token ID ${tokenId}`);
      }
    }
  } catch (error) {
    console.error("Failed to redeem Bear NFT:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
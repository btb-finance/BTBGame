const hre = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("Redeeming Bear NFT with account:", user.address);

  // Updated contract addresses from the recent deployment
  const nftAddress = "0x20Fcc806EA429fA6136D20F1F16cF1dE09b92b86";
  const gameAddress = "0xE54f03E9B70Ba772b3a476c12E0C1F2e7e9b967a";
  const mimoAddress = "0x238e3655475A7a351eBbe9A2aFeD61f97cc3eB92";
  
  // Get contract instances
  const bearNFT = await ethers.getContractAt("BearNFT", nftAddress);
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  const mimoToken = await ethers.getContractAt("MiMoGaMe", mimoAddress);
  
  // Check NFT balances
  const bearBalance = await bearNFT.balanceOf(user.address);
  const hunterBalance = await gameEcosystem.balanceOf(user.address);
  const bearContractBalance = await bearNFT.balanceOf(gameAddress);
  
  console.log(`You own ${bearBalance} Bear NFT(s)`);
  console.log(`You own ${hunterBalance} Hunter NFT(s)`);
  console.log(`Game ecosystem holds ${bearContractBalance} Bear NFT(s)`);
  
  // Check MiMo balance
  const mimoBalance = await mimoToken.balanceOf(user.address);
  console.log(`Your MiMo balance: ${ethers.formatEther(mimoBalance)} MiMo`);
  
  // Get redemption cost
  const redemptionAmount = ethers.parseEther("1000000"); // 1M MiMo
  const redemptionFee = redemptionAmount * 10n / 100n; // 10% fee
  const totalCost = redemptionAmount + redemptionFee;
  
  console.log(`Redemption cost: ${ethers.formatEther(redemptionAmount)} MiMo`);
  console.log(`Redemption fee: ${ethers.formatEther(redemptionFee)} MiMo`);
  console.log(`Total cost: ${ethers.formatEther(totalCost)} MiMo`);
  
  if (mimoBalance < totalCost) {
    console.error("Not enough MiMo tokens for redemption!");
    return;
  }
  
  if (bearContractBalance === 0n) {
    console.error("No Bear NFTs available for redemption in the ecosystem contract!");
    return;
  }
  
  // Approve MiMo tokens for redemption
  console.log("Approving MiMo tokens for redemption...");
  const approvalTx = await mimoToken.approve(gameAddress, totalCost);
  await approvalTx.wait();
  console.log("Approval confirmed");
  
  // Redeem Bear NFT
  console.log("Redeeming Bear NFT...");
  const redeemTx = await gameEcosystem.redeemBear();
  const receipt = await redeemTx.wait();
  
  // Check updated balances
  const newBearBalance = await bearNFT.balanceOf(user.address);
  const newMimoBalance = await mimoToken.balanceOf(user.address);
  
  console.log(`Redemption successful!`);
  console.log(`You now own ${newBearBalance} Bear NFT(s)`);
  console.log(`Your MiMo balance: ${ethers.formatEther(newMimoBalance)} MiMo`);
  console.log(`MiMo spent: ${ethers.formatEther(mimoBalance - newMimoBalance)} MiMo`);
  
  // Show the newly redeemed Bear NFT
  if (newBearBalance > bearBalance) {
    const lastTokenId = await bearNFT.tokenOfOwnerByIndex(user.address, Number(newBearBalance) - 1);
    console.log(`Redeemed Bear NFT Token ID: ${lastTokenId}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
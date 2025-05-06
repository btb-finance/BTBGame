const hre = require("hardhat");

async function main() {
  // Hardcoded addresses from the latest deployment
  const btbAddress = "0xDe5f2d9d57F341a90fdd7ecADC6e28110A87B94E";
  const nftAddress = "0x4AF11c8ea29039b9F169DBB08Bf6B794EB45BB7a";
  const gameAddress = "0xA44906a6c5A0fC974a73C76F6E8B8a5C066413B7";

  const [deployer] = await ethers.getSigners();
  console.log("Interacting with contracts using account:", deployer.address);
  console.log("Contract addresses:");
  console.log("BTB Token:", btbAddress);
  console.log("Bear NFT:", nftAddress);
  console.log("Game Ecosystem:", gameAddress);

  // Get contract instances
  const btbToken = await ethers.getContractAt("BTBFinance", btbAddress);
  const bearNFT = await ethers.getContractAt("BearNFT", nftAddress);
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);

  // Print contract information
  console.log("\nContract Information:");
  
  // BTB Token
  const btbName = await btbToken.name();
  const btbSymbol = await btbToken.symbol();
  const btbDecimals = await btbToken.decimals();
  const btbTotalSupply = await btbToken.totalSupply();
  const btbBalance = await btbToken.balanceOf(deployer.address);
  
  console.log("\nBTB Token:");
  console.log("- Name:", btbName);
  console.log("- Symbol:", btbSymbol);
  console.log("- Decimals:", btbDecimals);
  console.log("- Total Supply:", ethers.formatEther(btbTotalSupply));
  console.log("- Your Balance:", ethers.formatEther(btbBalance));

  // Bear NFT
  const nftName = await bearNFT.name();
  const nftSymbol = await bearNFT.symbol();
  const nftTotalMinted = await bearNFT.totalMinted();
  const nftRemainingSupply = await bearNFT.remainingSupply();
  const nftOwnerBalance = await bearNFT.balanceOf(deployer.address);
  const paymentToken = await bearNFT.paymentToken();
  const pricePerNFT = await bearNFT.pricePerNFT();
  
  console.log("\nBear NFT:");
  console.log("- Name:", nftName);
  console.log("- Symbol:", nftSymbol);
  console.log("- Total Minted:", nftTotalMinted);
  console.log("- Remaining Supply:", nftRemainingSupply);
  console.log("- Your Balance:", nftOwnerBalance);
  console.log("- Payment Token:", paymentToken);
  console.log("- Price Per NFT:", ethers.formatEther(pricePerNFT), "BTB");

  // Game Ecosystem
  const bearNFTAddress = await gameEcosystem.bearNFT();
  const btbTokenAddress = await gameEcosystem.btbToken();
  const feeReceiver = await gameEcosystem.feeReceiver();
  const liquidityReceiver = await gameEcosystem.liquidityReceiver();
  const depositPaused = await gameEcosystem.depositPaused();
  const redemptionPaused = await gameEcosystem.redemptionPaused();
  const swapPaused = await gameEcosystem.swapPaused();
  const mimoTotalSupply = await gameEcosystem.mimoTotalSupply();
  
  console.log("\nGame Ecosystem:");
  console.log("- Bear NFT Address:", bearNFTAddress);
  console.log("- BTB Token Address:", btbTokenAddress);
  console.log("- Fee Receiver:", feeReceiver);
  console.log("- Liquidity Receiver:", liquidityReceiver);
  console.log("- Deposit Paused:", depositPaused);
  console.log("- Redemption Paused:", redemptionPaused);
  console.log("- Swap Paused:", swapPaused);
  console.log("- MiMo Total Supply:", ethers.formatEther(mimoTotalSupply));

  console.log("\nBasic setup verification:");
  if (bearNFTAddress.toLowerCase() === nftAddress.toLowerCase()) {
    console.log("✅ Bear NFT address correctly set in game ecosystem");
  } else {
    console.log("❌ Bear NFT address mismatch!");
  }

  if (btbTokenAddress.toLowerCase() === btbAddress.toLowerCase()) {
    console.log("✅ BTB token address correctly set in game ecosystem");
  } else {
    console.log("❌ BTB token address mismatch!");
  }

  if (paymentToken.toLowerCase() === btbAddress.toLowerCase()) {
    console.log("✅ Payment token correctly set in Bear NFT contract");
  } else {
    console.log("❌ Payment token mismatch in Bear NFT contract!");
  }

  // Check contract functions
  console.log("\nFunctionality checks:");
  
  // Check if deposit is paused
  const depositPausedStatus = await gameEcosystem.depositPaused();
  console.log(`Deposit paused: ${depositPausedStatus}`);
  
  // Check if redemption is paused
  const redemptionPausedStatus = await gameEcosystem.redemptionPaused();
  console.log(`Redemption paused: ${redemptionPausedStatus}`);
  
  // Check if swap is paused
  const swapPausedStatus = await gameEcosystem.swapPaused();
  console.log(`Swap paused: ${swapPausedStatus}`);
  
  // Check the swap fee percentage
  const swapFeePercentage = await gameEcosystem.swapFeePercentage();
  console.log(`Swap fee percentage: ${Number(swapFeePercentage) / 100}%`);
  
  // Check the admin fee share
  const adminFeeShare = await gameEcosystem.adminFeeShare();
  console.log(`Admin fee share: ${Number(adminFeeShare) / 100}%`);
  
  // Check reward distribution percentages
  const ownerRewardPercentage = await gameEcosystem.ownerRewardPercentage();
  const burnPercentage = await gameEcosystem.burnPercentage();
  const liquidityPercentage = await gameEcosystem.liquidityPercentage();
  console.log(`Reward distribution: ${Number(ownerRewardPercentage) / 100}% to owner, ${Number(burnPercentage) / 100}% burned, ${Number(liquidityPercentage) / 100}% to liquidity`);

  console.log("\nInteraction complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
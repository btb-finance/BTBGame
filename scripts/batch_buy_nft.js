const hre = require("hardhat");

async function main() {
  const [buyer] = await ethers.getSigners();
  console.log("Buying multiple NFTs with account:", buyer.address);

  // Updated contract addresses from the recent deployment
  const btbAddress = "0xD68aB188F606A56C384FcC223DD4389c992b303E";
  const nftAddress = "0x20Fcc806EA429fA6136D20F1F16cF1dE09b92b86";
  
  // Get contract instances
  const btbToken = await ethers.getContractAt("BTBFinance", btbAddress);
  const bearNFT = await ethers.getContractAt("BearNFT", nftAddress);
  
  // How many NFTs to buy
  const nftsToBuy = 5;
  
  // Check price and approve tokens
  const pricePerNFT = await bearNFT.pricePerNFT();
  const totalPrice = pricePerNFT * BigInt(nftsToBuy);
  
  console.log(`Price per NFT: ${ethers.formatEther(pricePerNFT)} BTB`);
  console.log(`Total price for ${nftsToBuy} NFT(s): ${ethers.formatEther(totalPrice)} BTB`);
  
  // Check balance
  const balance = await btbToken.balanceOf(buyer.address);
  console.log(`Your BTB balance: ${ethers.formatEther(balance)} BTB`);
  
  if (balance < totalPrice) {
    console.error("Not enough BTB tokens to buy NFTs!");
    return;
  }
  
  // Approve tokens
  console.log(`Approving ${ethers.formatEther(totalPrice)} BTB for NFT purchases...`);
  const approvalTx = await btbToken.approve(nftAddress, totalPrice);
  await approvalTx.wait();
  console.log("Approval confirmed");
  
  // Buy NFTs
  console.log(`Buying ${nftsToBuy} NFT(s)...`);
  const buyTx = await bearNFT.buyNFT(nftsToBuy);
  const receipt = await buyTx.wait();
  
  // Check NFT balance
  const nftBalance = await bearNFT.balanceOf(buyer.address);
  console.log(`Purchase successful! You now own ${nftBalance} NFT(s)`);
  
  // Show all token IDs
  for (let i = 0; i < Number(nftBalance); i++) {
    const tokenId = await bearNFT.tokenOfOwnerByIndex(buyer.address, i);
    console.log(`NFT #${i+1}: Token ID ${tokenId}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const hre = require("hardhat");

async function main() {
  const [buyer] = await ethers.getSigners();
  console.log("Buying NFT with account:", buyer.address);

  // Contract addresses
  const btbAddress = "0xDe5f2d9d57F341a90fdd7ecADC6e28110A87B94E";
  const nftAddress = "0x4AF11c8ea29039b9F169DBB08Bf6B794EB45BB7a";
  
  // Get contract instances
  const btbToken = await ethers.getContractAt("BTBFinance", btbAddress);
  const bearNFT = await ethers.getContractAt("BearNFT", nftAddress);
  
  // How many NFTs to buy
  const nftsToBuy = 1;
  
  // Check price and approve tokens
  const pricePerNFT = await bearNFT.pricePerNFT();
  const totalPrice = pricePerNFT * BigInt(nftsToBuy);
  
  console.log(`Price per NFT: ${ethers.formatEther(pricePerNFT)} BTB`);
  console.log(`Total price for ${nftsToBuy} NFT(s): ${ethers.formatEther(totalPrice)} BTB`);
  
  // Check balance
  const balance = await btbToken.balanceOf(buyer.address);
  console.log(`Your BTB balance: ${ethers.formatEther(balance)} BTB`);
  
  if (balance < totalPrice) {
    console.error("Not enough BTB tokens to buy NFT!");
    return;
  }
  
  // Approve tokens
  console.log(`Approving ${ethers.formatEther(totalPrice)} BTB for NFT purchase...`);
  const approvalTx = await btbToken.approve(nftAddress, totalPrice);
  await approvalTx.wait();
  console.log("Approval confirmed");
  
  // Buy NFT
  console.log(`Buying ${nftsToBuy} NFT(s)...`);
  const buyTx = await bearNFT.buyNFT(nftsToBuy);
  const receipt = await buyTx.wait();
  
  // Check NFT balance
  const nftBalance = await bearNFT.balanceOf(buyer.address);
  console.log(`Purchase successful! You now own ${nftBalance} NFT(s)`);
  
  // Show token IDs
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
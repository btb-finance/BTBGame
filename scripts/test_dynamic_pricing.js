const hre = require("hardhat");

async function main() {
  const [user] = await ethers.getSigners();
  console.log("Testing dynamic pricing with account:", user.address);

  // Contract addresses (will need to be replaced with actual deployed addresses)
  const btbAddress = "REPLACE_WITH_DEPLOYED_BTB_ADDRESS";
  const nftAddress = "REPLACE_WITH_DEPLOYED_DYNAMIC_NFT_ADDRESS";
  
  // Get contract instances
  const btbToken = await ethers.getContractAt("BTBFinance", btbAddress);
  const bearNFT = await ethers.getContractAt("BearNFTDynamic", nftAddress);
  
  // Check initial price
  const initialPrice = await bearNFT.getSwapRate();
  console.log(`Initial NFT price: ${ethers.formatEther(initialPrice)} BTB`);
  
  // Check contract state
  const btbBalance = await btbToken.balanceOf(nftAddress);
  const nftsInContract = await bearNFT.balanceOf(nftAddress);
  const totalMinted = await bearNFT.totalMinted();
  const remainingSupply = await bearNFT.remainingSupply();
  
  console.log(`\nContract State:
- BTB in contract: ${ethers.formatEther(btbBalance)} BTB
- NFTs in contract: ${nftsInContract}
- Total minted: ${totalMinted}
- Remaining supply: ${remainingSupply}
- NFTs in circulation: ${totalMinted - nftsInContract}`);
  
  // Buy an NFT
  console.log("\nBuying an NFT...");
  const nftsToBuy = 1;
  const buyPrice = await bearNFT.getPrice(nftsToBuy);
  console.log(`Price for ${nftsToBuy} NFT: ${ethers.formatEther(buyPrice)} BTB`);
  
  // Approve tokens
  console.log(`Approving ${ethers.formatEther(buyPrice)} BTB for NFT purchase...`);
  await btbToken.approve(nftAddress, buyPrice);
  
  // Buy the NFT
  const buyTx = await bearNFT.buyNFT(nftsToBuy);
  await buyTx.wait();
  console.log("Purchase successful!");
  
  // Check new user NFT balance
  const userNftBalance = await bearNFT.balanceOf(user.address);
  console.log(`You now own ${userNftBalance} NFT(s)`);
  
  // Check new price after purchase
  const newPrice = await bearNFT.getSwapRate();
  console.log(`\nNew NFT price after purchase: ${ethers.formatEther(newPrice)} BTB`);
  
  // Check updated contract state
  const newBtbBalance = await btbToken.balanceOf(nftAddress);
  const newNftsInContract = await bearNFT.balanceOf(nftAddress);
  
  console.log(`\nUpdated Contract State:
- BTB in contract: ${ethers.formatEther(newBtbBalance)} BTB (${ethers.formatEther(newBtbBalance - btbBalance)} increase)
- NFTs in contract: ${newNftsInContract} (${nftsInContract - newNftsInContract} decrease)
- NFTs in circulation: ${(await bearNFT.totalMinted()) - newNftsInContract}`);
  
  // Sell the NFT back
  console.log("\nSelling an NFT back to the contract...");
  
  // Get the token ID we just bought
  const tokenId = await bearNFT.tokenOfOwnerByIndex(user.address, 0);
  console.log(`Selling NFT with Token ID: ${tokenId}`);
  
  // Sell the NFT
  const sellTx = await bearNFT.sellNFT([tokenId]);
  const sellReceipt = await sellTx.wait();
  const sellEvent = sellReceipt.logs[0]; // This is a simplification, should really parse the event
  console.log(`NFT sold successfully!`);
  
  // Check user balances after sell
  const finalUserNftBalance = await bearNFT.balanceOf(user.address);
  console.log(`You now own ${finalUserNftBalance} NFT(s)`);
  
  // Check final price
  const finalPrice = await bearNFT.getSwapRate();
  console.log(`\nFinal NFT price after selling: ${ethers.formatEther(finalPrice)} BTB`);
  
  // Summary
  console.log("\n=== Dynamic Pricing Summary ===");
  console.log(`Initial price: ${ethers.formatEther(initialPrice)} BTB`);
  console.log(`Price after buying: ${ethers.formatEther(newPrice)} BTB`);
  console.log(`Final price after selling: ${ethers.formatEther(finalPrice)} BTB`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
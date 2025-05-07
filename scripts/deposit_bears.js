const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Depositing bears with account:", deployer.address);

  // Using the provided contract addresses
  const ecosystemAddress = "0xf7785FaE120933eEAED165670dE0E53527Af680C";
  const bearNFTAddress = "0x08FDD69Cc1691bbaE5eB0Ac2efa2DBF85192b4ab";
  
  // Create minimal ABIs
  const bearNFTAbi = [
    "function approve(address to, uint256 tokenId) public"
  ];
  
  const ecosystemAbi = [
    "function depositBear(uint256 bearId) public"
  ];
  
  // Get contract instances
  const bearNFT = new ethers.Contract(bearNFTAddress, bearNFTAbi, deployer);
  const gameEcosystem = new ethers.Contract(ecosystemAddress, ecosystemAbi, deployer);
  
  // Bear NFT token IDs to deposit
  const bearTokenIds = [1, 2, 3];
  
  console.log(`Will deposit Bear NFTs with token IDs: ${bearTokenIds.join(', ')}`);
  
  // Deposit each Bear NFT
  for (const tokenId of bearTokenIds) {
    try {
      // Approve the ecosystem contract to transfer the NFT
      console.log(`\nApproving ecosystem to transfer Bear NFT ${tokenId}...`);
      const approveTx = await bearNFT.approve(ecosystemAddress, tokenId, {
        gasLimit: 1000000
      });
      console.log("Transaction sent. Waiting for confirmation...");
      await approveTx.wait();
      console.log(`Approval confirmed for token ID ${tokenId}`);
      
      // Deposit the NFT
      console.log(`Depositing Bear NFT ${tokenId} into ecosystem...`);
      const depositTx = await gameEcosystem.depositBear(tokenId, {
        gasLimit: 1000000
      });
      console.log("Transaction sent. Waiting for confirmation...");
      await depositTx.wait();
      console.log(`Deposit successful for Bear NFT ${tokenId}!`);
    } catch (error) {
      console.log(`Error processing Bear NFT ${tokenId}:`, error.message);
    }
  }
  
  console.log("\nAll deposits completed! Check your wallet for Hunter NFTs.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
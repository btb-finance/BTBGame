const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Minting bears with account:", deployer.address);

  // Using the provided contract addresses
  const ecosystemAddress = "0xf7785FaE120933eEAED165670dE0E53527Af680C";
  const bearNFTAddress = "0x08FDD69Cc1691bbaE5eB0Ac2efa2DBF85192b4ab";
  const btbTokenAddress = "0x60FC6D220840237a115BA53E72B03CA8c2a89112";
  
  // Number of NFTs to mint/buy
  const nftsToMint = 3;
  
  // Create minimal ABI for BearNFT
  const bearNFTAbi = [
    "function safeMint(address to) public returns (uint256)",
    "function batchMint(address to, uint256 amount) public returns (uint256[] memory)",
    "function approve(address to, uint256 tokenId) public",
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  ];
  
  // Create minimal ABI for EcosystemContract
  const ecosystemAbi = [
    "function depositBear(uint256 bearId) public",
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function getHunterStats(uint256 tokenId) view returns (uint96,uint96,uint96,uint128,uint8,bool,uint96,uint128,uint256)",
    "event BearDeposited(address indexed user, uint256 bearId, uint256 hunterId)"
  ];
  
  // Get contract instances with minimal ABIs
  const bearNFT = new ethers.Contract(bearNFTAddress, bearNFTAbi, deployer);
  const gameEcosystem = new ethers.Contract(ecosystemAddress, ecosystemAbi, deployer);
  
  const tokenIds = [];
  
  console.log("Attempting to mint Bears directly...");
  try {
    // Try to use the admin batchMint function first
    console.log(`Batch minting ${nftsToMint} bear NFTs...`);
    const mintTx = await bearNFT.batchMint(deployer.address, nftsToMint);
    const receipt = await mintTx.wait();
    console.log("Batch minting successful!");
    
    // Try to extract token IDs from event logs
    for (const event of receipt.logs) {
      try {
        const iface = new ethers.Interface(bearNFTAbi);
        const parsedLog = iface.parseLog(event);
        if (parsedLog && parsedLog.name === "Transfer" && parsedLog.args[0] === ethers.ZeroAddress) {
          const tokenId = parsedLog.args[2];
          console.log(`Minted NFT with ID: ${tokenId}`);
          tokenIds.push(tokenId);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  } catch (error) {
    console.error("Error with batch minting:", error.message);
    
    // Try individual minting if batch fails
    console.log("Trying individual minting...");
    for (let i = 0; i < nftsToMint; i++) {
      try {
        console.log(`Minting NFT #${i+1}...`);
        const mintTx = await bearNFT.safeMint(deployer.address);
        const receipt = await mintTx.wait();
        
        // Try to extract token ID from event logs
        for (const event of receipt.logs) {
          try {
            const iface = new ethers.Interface(bearNFTAbi);
            const parsedLog = iface.parseLog(event);
            if (parsedLog && parsedLog.name === "Transfer" && parsedLog.args[0] === ethers.ZeroAddress) {
              const tokenId = parsedLog.args[2];
              console.log(`Minted NFT #${i+1} with ID: ${tokenId}`);
              tokenIds.push(tokenId);
              break;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      } catch (error) {
        console.error(`Error with minting NFT #${i+1}:`, error.message);
      }
    }
  }
  
  // Manual input if automatic detection fails
  if (tokenIds.length === 0) {
    console.log("Could not automatically detect Bear NFT token IDs.");
    console.log("Please check your wallet for the newly minted Bear NFTs and note their token IDs.");
    
    // Hardcoded token IDs for testing - adjust these as needed
    const manualTokenIds = [1, 2, 3]; // Example IDs, these should be replaced with actual minted token IDs
    console.log(`Using hardcoded token IDs: ${manualTokenIds.join(", ")}`);
    tokenIds.push(...manualTokenIds);
  }
  
  // Deposit Bears into the ecosystem
  console.log("\nNow depositing bears into the ecosystem...");
  for (let i = 0; i < tokenIds.length; i++) {
    try {
      // First check ownership
      const owner = await bearNFT.ownerOf(tokenIds[i]).catch(() => null);
      if (owner && owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log(`Token ID ${tokenIds[i]} is not owned by you. Skipping...`);
        continue;
      }
      
      // Approve the game contract to transfer the NFT
      console.log(`Approving NFT transfer for token ID ${tokenIds[i]} to the ecosystem...`);
      const approvalTx = await bearNFT.approve(ecosystemAddress, tokenIds[i]);
      await approvalTx.wait();
      console.log("Approval confirmed");
      
      // Deposit the NFT
      console.log(`Depositing Bear NFT with token ID ${tokenIds[i]}...`);
      const depositTx = await gameEcosystem.depositBear(tokenIds[i]);
      const receipt = await depositTx.wait();
      console.log(`Deposit of token ID ${tokenIds[i]} successful!`);
      
      // Try to extract Hunter ID from event logs
      for (const event of receipt.logs) {
        try {
          const iface = new ethers.Interface(ecosystemAbi);
          const parsedLog = iface.parseLog(event);
          if (parsedLog && parsedLog.name === "BearDeposited") {
            const hunterId = parsedLog.args[2];
            console.log(`Received Hunter NFT with ID: ${hunterId}`);
            break;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    } catch (error) {
      console.error(`Error depositing Bear NFT ${tokenIds[i]}:`, error.message);
    }
  }
  
  // Check final Hunter NFT balance
  try {
    const hunterBalance = await gameEcosystem.balanceOf(deployer.address);
    console.log(`You now own ${hunterBalance} Hunter NFT(s)`);
    
    // Show Hunter token IDs and stats
    for (let i = 0; i < Number(hunterBalance); i++) {
      try {
        const hunterId = await gameEcosystem.tokenOfOwnerByIndex(deployer.address, i);
        console.log(`Hunter #${i+1}: Token ID ${hunterId}`);
        
        // Get Hunter stats
        const stats = await gameEcosystem.getHunterStats(hunterId);
        console.log(`Hunter Stats:
        - Creation Time: ${new Date(Number(stats[0]) * 1000).toLocaleString()}
        - Power: ${ethers.formatEther(stats[3])}
        - Days Remaining: ${stats[8]}`);
      } catch (error) {
        console.error(`Error getting hunter stats for index ${i}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Error getting Hunter NFT balance:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
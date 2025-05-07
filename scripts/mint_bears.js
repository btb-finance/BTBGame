const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Minting bears with account:", deployer.address);

  // Using the provided contract addresses
  const ecosystemAddress = "0xf7785FaE120933eEAED165670dE0E53527Af680C";
  const bearNFTAddress = "0x08FDD69Cc1691bbaE5eB0Ac2efa2DBF85192b4ab";
  const btbTokenAddress = "0x60FC6D220840237a115BA53E72B03CA8c2a89112";
  
  // Get contract instances
  const btbToken = await ethers.getContractAt("BTBFinance", btbTokenAddress);
  const bearNFT = await ethers.getContractAt("BearNFT", bearNFTAddress);
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", ecosystemAddress);
  
  // First check if our account has permission to mint
  try {
    const nftOwner = await bearNFT.owner();
    console.log("BearNFT owner:", nftOwner);
    if (nftOwner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("You have owner privileges to mint NFTs");
    } else {
      console.log("You don't have owner privileges. Will try to buy NFTs instead.");
    }
  } catch (error) {
    console.log("Error checking contract owner, will attempt to mint anyway:", error.message);
  }
  
  // How many NFTs to mint/buy
  const nftsToMint = 3;
  const tokenIds = [];
  
  console.log("Attempting to mint Bears directly...");
  try {
    // Try to use the admin batchMint function first
    console.log(`Batch minting ${nftsToMint} bear NFTs...`);
    const mintTx = await bearNFT.batchMint(deployer.address, nftsToMint);
    await mintTx.wait();
    console.log("Batch minting successful!");
    
    // Get the minted token IDs
    const nftBalance = await bearNFT.balanceOf(deployer.address);
    console.log(`You own ${nftBalance} Bear NFT(s)`);
    
    if (nftBalance > 0) {
      for (let i = 0; i < Number(nftBalance); i++) {
        try {
          const tokenId = await bearNFT.tokenOfOwnerByIndex(deployer.address, i);
          console.log(`NFT #${i+1}: Token ID ${tokenId}`);
          tokenIds.push(tokenId);
        } catch (error) {
          console.error(`Error getting token ID at index ${i}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error("Error with batch minting:", error.message);
    
    // Try individual minting if batch fails
    console.log("Trying individual minting...");
    for (let i = 0; i < nftsToMint; i++) {
      try {
        const mintTx = await bearNFT.safeMint(deployer.address);
        const receipt = await mintTx.wait();
        
        // Try to extract token ID from event logs
        let tokenId;
        for (const event of receipt.logs) {
          try {
            const parsedLog = bearNFT.interface.parseLog(event);
            if (parsedLog && parsedLog.name === "Transfer" && parsedLog.args[0] === ethers.ZeroAddress) {
              tokenId = parsedLog.args[2];
              break;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        
        if (tokenId) {
          console.log(`Minted NFT #${i+1} with ID: ${tokenId}`);
          tokenIds.push(tokenId);
        } else {
          console.log(`Minted NFT #${i+1}, but couldn't determine the token ID`);
        }
      } catch (error) {
        console.error(`Error with minting NFT #${i+1}:`, error.message);
      }
    }
  }

  if (tokenIds.length === 0) {
    console.log("No Bears were minted. Trying to buy Bears instead...");
    
    // Try to buy NFTs if minting fails
    try {
      // Check price
      const pricePerNFT = await bearNFT.pricePerNFT();
      const totalPrice = pricePerNFT * BigInt(nftsToMint);
      
      console.log(`Price per NFT: ${ethers.formatEther(pricePerNFT)} BTB`);
      console.log(`Total price for ${nftsToMint} NFT(s): ${ethers.formatEther(totalPrice)} BTB`);
      
      // Check balance
      const balance = await btbToken.balanceOf(deployer.address);
      console.log(`Your BTB balance: ${ethers.formatEther(balance)} BTB`);
      
      if (balance < totalPrice) {
        console.error("Not enough BTB tokens to buy NFTs!");
      } else {
        // Approve tokens
        console.log(`Approving ${ethers.formatEther(totalPrice)} BTB for NFT purchases...`);
        const approvalTx = await btbToken.approve(bearNFTAddress, totalPrice);
        await approvalTx.wait();
        console.log("Approval confirmed");
        
        // Buy NFTs
        console.log(`Buying ${nftsToMint} NFT(s)...`);
        const buyTx = await bearNFT.buyNFT(nftsToMint);
        const receipt = await buyTx.wait();
        console.log("Purchase successful!");
        
        // Get the purchased token IDs
        const nftBalance = await bearNFT.balanceOf(deployer.address);
        console.log(`You now own ${nftBalance} Bear NFT(s)`);
        
        // Show all token IDs
        for (let i = 0; i < Number(nftBalance); i++) {
          try {
            const tokenId = await bearNFT.tokenOfOwnerByIndex(deployer.address, i);
            console.log(`NFT #${i+1}: Token ID ${tokenId}`);
            tokenIds.push(tokenId);
          } catch (error) {
            console.error(`Error getting token ID at index ${i}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error("Error buying NFTs:", error.message);
    }
  }

  if (tokenIds.length === 0) {
    console.log("Failed to acquire any Bear NFTs. Exiting.");
    return;
  }

  // Deposit Bears into the ecosystem
  console.log("\nNow depositing bears into the ecosystem...");
  for (let i = 0; i < tokenIds.length; i++) {
    try {
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
      let hunterId;
      for (const event of receipt.logs) {
        try {
          const parsedLog = gameEcosystem.interface.parseLog(event);
          if (parsedLog && parsedLog.name === "BearDeposited") {
            hunterId = parsedLog.args[2];
            console.log(`Received Hunter NFT with ID: ${hunterId}`);
            break;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      if (!hunterId) {
        console.log("Deposit successful but couldn't determine the Hunter ID");
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
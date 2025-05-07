const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Working with account:", deployer.address);

  // Using the provided contract addresses
  const ecosystemAddress = "0xf7785FaE120933eEAED165670dE0E53527Af680C";
  const bearNFTAddress = "0x08FDD69Cc1691bbaE5eB0Ac2efa2DBF85192b4ab";
  const btbTokenAddress = "0x60FC6D220840237a115BA53E72B03CA8c2a89112";
  
  // First, get the raw ERC721 interface to check balance
  const erc721Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)"
  ];
  
  // Create minimal ABI for BearNFT with minting functions
  const bearNFTAbi = [
    ...erc721Abi,
    "function safeMint(address to) public returns (uint256)",
    "function batchMint(address to, uint256 amount) public returns (uint256[] memory)",
    "function approve(address to, uint256 tokenId) public",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  ];
  
  // Create minimal ABI for EcosystemContract
  const ecosystemAbi = [
    ...erc721Abi,
    "function depositBear(uint256 bearId) public",
    "function getHunterStats(uint256 tokenId) view returns (uint96,uint96,uint96,uint128,uint8,bool,uint96,uint128,uint256)",
    "event BearDeposited(address indexed user, uint256 bearId, uint256 hunterId)"
  ];
  
  // Get contract instances with minimal ABIs
  const bearNFT = new ethers.Contract(bearNFTAddress, bearNFTAbi, deployer);
  const gameEcosystem = new ethers.Contract(ecosystemAddress, ecosystemAbi, deployer);
  
  // First check if the contracts are valid by checking some basic info
  console.log("Verifying contracts...");
  
  try {
    console.log("Checking Bear NFT contract...");
    try {
      const name = await bearNFT.name();
      const symbol = await bearNFT.symbol();
      const totalSupply = await bearNFT.totalSupply();
      console.log(`NFT Contract: ${name} (${symbol}), Total Supply: ${totalSupply}`);
    } catch (error) {
      console.log("Could not get Bear NFT contract details:", error.message);
    }
    
    // Let's try to check if the user already owns any bear NFTs
    console.log("\nChecking if you already own any Bear NFTs...");
    let currentBearBalance = 0;
    try {
      currentBearBalance = await bearNFT.balanceOf(deployer.address);
      console.log(`You currently own ${currentBearBalance} Bear NFT(s)`);
      
      if (currentBearBalance > 0) {
        for (let i = 0; i < Number(currentBearBalance); i++) {
          try {
            const tokenId = await bearNFT.tokenOfOwnerByIndex(deployer.address, i);
            console.log(`Bear NFT #${i+1}: Token ID ${tokenId}`);
          } catch (error) {
            console.log(`Could not get token ID for Bear #${i+1}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log("Could not check Bear NFT balance:", error.message);
    }
    
    // Now check for Hunter NFTs
    console.log("\nChecking if you already own any Hunter NFTs...");
    let currentHunterBalance = 0;
    try {
      currentHunterBalance = await gameEcosystem.balanceOf(deployer.address);
      console.log(`You currently own ${currentHunterBalance} Hunter NFT(s)`);
      
      if (currentHunterBalance > 0) {
        for (let i = 0; i < Number(currentHunterBalance); i++) {
          try {
            const tokenId = await gameEcosystem.tokenOfOwnerByIndex(deployer.address, i);
            console.log(`Hunter NFT #${i+1}: Token ID ${tokenId}`);
          } catch (error) {
            console.log(`Could not get token ID for Hunter #${i+1}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log("Could not check Hunter NFT balance:", error.message);
    }
    
    // If no bears, mint some - we'll mint 3
    const nftsToMint = 3;
    const bearTokenIds = [];
    
    if (currentBearBalance == 0) {
      console.log("\nNo Bear NFTs found. Minting new ones...");
      
      try {
        console.log(`Attempting to batch mint ${nftsToMint} Bear NFTs...`);
        const mintTx = await bearNFT.batchMint(deployer.address, nftsToMint, {
          gasLimit: 3000000 // Set a high gas limit to ensure transaction goes through
        });
        console.log("Batch mint transaction sent. Waiting for confirmation...");
        const receipt = await mintTx.wait();
        console.log("Batch minting successful!");
        
        // Try to extract token IDs from logs
        console.log("Extracting token IDs from transaction logs...");
        let foundIds = 0;
        
        for (const log of receipt.logs) {
          try {
            const topics = log.topics;
            // ERC721 Transfer event has signature: Transfer(address,address,uint256)
            // The token ID is the 3rd indexed parameter (index 2)
            if (topics[0] === ethers.id("Transfer(address,address,uint256)")) {
              // For a mint, the "from" address is the zero address
              const from = ethers.dataSlice(topics[1], 12);
              if (from === '0x000000000000000000000000') {
                // This is a mint event
                const tokenId = ethers.toNumber(topics[3]);
                console.log(`Detected minted Bear NFT with token ID: ${tokenId}`);
                bearTokenIds.push(tokenId);
                foundIds++;
              }
            }
          } catch (e) {
            // Continue to next log
          }
        }
        
        console.log(`Found ${foundIds} minted token IDs`);
      } catch (error) {
        console.log("Error with batch minting:", error.message);
        
        // Try minting one by one
        console.log("\nTrying individual minting...");
        for (let i = 0; i < nftsToMint; i++) {
          try {
            console.log(`Minting Bear NFT #${i+1}...`);
            const mintTx = await bearNFT.safeMint(deployer.address, {
              gasLimit: 1000000 // Set a high gas limit
            });
            console.log("Transaction sent. Waiting for confirmation...");
            const receipt = await mintTx.wait();
            console.log(`Minting #${i+1} successful!`);
            
            // Try to extract token ID from logs
            for (const log of receipt.logs) {
              try {
                const topics = log.topics;
                if (topics[0] === ethers.id("Transfer(address,address,uint256)")) {
                  const from = ethers.dataSlice(topics[1], 12);
                  if (from === '0x000000000000000000000000') {
                    const tokenId = ethers.toNumber(topics[3]);
                    console.log(`Detected minted Bear NFT with token ID: ${tokenId}`);
                    bearTokenIds.push(tokenId);
                    break;
                  }
                }
              } catch (e) {
                // Continue to next log
              }
            }
          } catch (error) {
            console.log(`Error minting Bear NFT #${i+1}:`, error.message);
          }
        }
      }
      
      // Check if the balance updated
      try {
        const newBalance = await bearNFT.balanceOf(deployer.address);
        console.log(`Updated Bear NFT balance: ${newBalance}`);
        
        if (newBalance > 0 && bearTokenIds.length === 0) {
          console.log("Bears were minted but IDs couldn't be detected. Checking owned tokens...");
          for (let i = 0; i < Number(newBalance); i++) {
            try {
              const tokenId = await bearNFT.tokenOfOwnerByIndex(deployer.address, i);
              console.log(`Found Bear NFT #${i+1}: Token ID ${tokenId}`);
              bearTokenIds.push(Number(tokenId));
            } catch (error) {
              console.log(`Could not get token ID for Bear #${i+1}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.log("Could not check updated Bear NFT balance:", error.message);
      }
    } else {
      // Already have bear NFTs, collect their IDs
      console.log("\nUsing existing Bear NFTs...");
      for (let i = 0; i < Number(currentBearBalance); i++) {
        try {
          const tokenId = await bearNFT.tokenOfOwnerByIndex(deployer.address, i);
          console.log(`Using existing Bear NFT #${i+1}: Token ID ${tokenId}`);
          bearTokenIds.push(Number(tokenId));
        } catch (error) {
          console.log(`Could not get token ID for Bear #${i+1}:`, error.message);
        }
      }
    }
    
    // If no Bear NFTs were found or minted, use hardcoded IDs for testing
    if (bearTokenIds.length === 0) {
      console.log("\nNo Bear NFT IDs could be determined. Using test IDs for deposit attempt...");
      // Try some low token IDs that might exist
      bearTokenIds.push(1, 2, 3);
      console.log(`Test Bear NFT IDs: ${bearTokenIds.join(', ')}`);
    }
    
    // Now deposit Bears into the ecosystem
    console.log("\nDepositing Bears into the ecosystem...");
    for (const tokenId of bearTokenIds) {
      try {
        // First check if we actually own this token
        let isOwner = false;
        try {
          const owner = await bearNFT.ownerOf(tokenId);
          isOwner = (owner.toLowerCase() === deployer.address.toLowerCase());
          console.log(`Bear NFT ${tokenId} owner: ${owner} (You: ${isOwner ? 'Yes' : 'No'})`);
          
          if (!isOwner) {
            console.log(`Skipping deposit for Bear NFT ${tokenId} (not owned)`);
            continue;
          }
        } catch (error) {
          console.log(`Could not verify ownership of Bear NFT ${tokenId}:`, error.message);
          console.log(`Attempting deposit anyway...`);
        }
        
        // Approve ecosystem to transfer the NFT
        console.log(`Approving ecosystem contract to transfer Bear NFT ${tokenId}...`);
        const approveTx = await bearNFT.approve(ecosystemAddress, tokenId, {
          gasLimit: 1000000
        });
        await approveTx.wait();
        console.log(`Approval confirmed for token ID ${tokenId}`);
        
        // Deposit the NFT
        console.log(`Depositing Bear NFT ${tokenId} into ecosystem...`);
        const depositTx = await gameEcosystem.depositBear(tokenId, {
          gasLimit: 1000000
        });
        const receipt = await depositTx.wait();
        console.log(`Deposit successful for Bear NFT ${tokenId}!`);
        
        // Try to extract Hunter ID from logs
        let hunterId = null;
        for (const log of receipt.logs) {
          try {
            const topics = log.topics;
            if (topics[0] === ethers.id("BearDeposited(address,uint256,uint256)")) {
              const depositor = ethers.dataSlice(topics[1], 12);
              if (depositor.toLowerCase() === deployer.address.slice(2).toLowerCase()) {
                const data = ethers.dataSlice(log.data, 0);
                const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'uint256'], data);
                hunterId = decodedData[1];
                console.log(`Received Hunter NFT with ID: ${hunterId}`);
                break;
              }
            }
          } catch (e) {
            // Continue to next log
          }
        }
        
        if (!hunterId) {
          console.log(`Could not determine Hunter NFT ID for deposited Bear NFT ${tokenId}`);
        }
      } catch (error) {
        console.log(`Error depositing Bear NFT ${tokenId}:`, error.message);
      }
    }
    
    // Final check for Hunter NFTs
    console.log("\nChecking final Hunter NFT balance...");
    try {
      const finalHunterBalance = await gameEcosystem.balanceOf(deployer.address);
      console.log(`You now own ${finalHunterBalance} Hunter NFT(s)`);
      
      if (finalHunterBalance > 0) {
        for (let i = 0; i < Number(finalHunterBalance); i++) {
          try {
            const tokenId = await gameEcosystem.tokenOfOwnerByIndex(deployer.address, i);
            console.log(`Hunter NFT #${i+1}: Token ID ${tokenId}`);
            
            // Try to get Hunter stats
            try {
              const stats = await gameEcosystem.getHunterStats(tokenId);
              console.log(`Hunter #${tokenId} Stats:
              - Creation Time: ${new Date(Number(stats[0]) * 1000).toLocaleString()}
              - Power: ${ethers.formatEther(stats[3])}
              - Days Remaining: ${stats[8]}`);
            } catch (error) {
              console.log(`Could not get stats for Hunter NFT ${tokenId}:`, error.message);
            }
          } catch (error) {
            console.log(`Could not get token ID for Hunter #${i+1}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log("Could not check final Hunter NFT balance:", error.message);
    }
    
  } catch (error) {
    console.error("Critical error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
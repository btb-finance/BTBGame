const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Define a file to store deployed contract addresses
const CONTRACTS_FILE = path.join(__dirname, "deployed_contracts.json");

// Try to load deployed contract addresses from file, or use defaults
let deployedAddresses;
try {
  if (fs.existsSync(CONTRACTS_FILE)) {
    const fileContent = fs.readFileSync(CONTRACTS_FILE, 'utf8');
    deployedAddresses = JSON.parse(fileContent);
    console.log("Loaded deployed contract addresses from file");
  } else {
    // Default addresses if no file exists
    deployedAddresses = {
      ECOSYSTEM_ADDRESS: "0x6d5c4bc6e5394be42a4d34e7b26a3acea0b53387", // Bear Hunter Ecosystem
      BTB_TOKEN_ADDRESS: "0xd4e09f3c17cd8d7de1bb4a42c9abebae5f28a8f9", // BTB Token
      BEAR_NFT_ADDRESS: "0x8eb0741a3ffd24a562ab98f09fde28d61c840522", // Bear NFT 
      MIMO_TOKEN_ADDRESS: "0x3a08c97b75c7084fca57a2af5a9a26d11be15b5f", // MiMo Token
      BTB_SWAP_LOGIC_ADDRESS: "0x8dA03278687f07a6F1236A3e5733087F4A944Fc2" // BTB Swap Logic
    };
    console.log("Using default contract addresses");
  }
} catch (error) {
  console.error("Error loading contract addresses:", error);
  // Use default addresses if there was an error
  deployedAddresses = {
    ECOSYSTEM_ADDRESS: "0x6d5c4bc6e5394be42a4d34e7b26a3acea0b53387", // Bear Hunter Ecosystem
    BTB_TOKEN_ADDRESS: "0xd4e09f3c17cd8d7de1bb4a42c9abebae5f28a8f9", // BTB Token
    BEAR_NFT_ADDRESS: "0x8eb0741a3ffd24a562ab98f09fde28d61c840522", // Bear NFT 
    MIMO_TOKEN_ADDRESS: "0x3a08c97b75c7084fca57a2af5a9a26d11be15b5f", // MiMo Token
    BTB_SWAP_LOGIC_ADDRESS: "0x8dA03278687f07a6F1236A3e5733087F4A944Fc2" // BTB Swap Logic
  };
}

// Extract addresses from the loaded object
const ECOSYSTEM_ADDRESS = deployedAddresses.ECOSYSTEM_ADDRESS; 
const BTB_TOKEN_ADDRESS = deployedAddresses.BTB_TOKEN_ADDRESS;
const BEAR_NFT_ADDRESS = deployedAddresses.BEAR_NFT_ADDRESS;
const MIMO_TOKEN_ADDRESS = deployedAddresses.MIMO_TOKEN_ADDRESS;
const BTB_SWAP_LOGIC_ADDRESS = deployedAddresses.BTB_SWAP_LOGIC_ADDRESS || "0x8dA03278687f07a6F1236A3e5733087F4A944Fc2";

// Default NFT ID to test with
const HUNTER_NFT_ID = 1; // We now have Hunter #1

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH");

  // Get contract instances - using let instead of const so we can update them later
  let gameContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
  let btbToken = await ethers.getContractAt("IERC20", BTB_TOKEN_ADDRESS);
  let bearNFT = await ethers.getContractAt("IERC721", BEAR_NFT_ADDRESS);
  let mimoToken = await ethers.getContractAt("MiMoGaMe", MIMO_TOKEN_ADDRESS);
  let btbSwapLogic = await ethers.getContractAt("BTBSwapLogic", BTB_SWAP_LOGIC_ADDRESS);

  // First, let's add a verification function
  async function verifyContracts() {
    console.log("\n===== VERIFYING CONTRACTS =====");
    
    // Check if contracts exist at the addresses
    const provider = ethers.provider;
    
    console.log("\nChecking contract bytecode at addresses...");
    
    // BearHunterEcosystem
    let code = await provider.getCode(ECOSYSTEM_ADDRESS);
    console.log(`BearHunterEcosystem (${ECOSYSTEM_ADDRESS}):`);
    console.log(`- Has code: ${code !== '0x' ? 'Yes' : 'No'}`);
    
    // BTB Token
    code = await provider.getCode(BTB_TOKEN_ADDRESS);
    console.log(`\nBTB Token (${BTB_TOKEN_ADDRESS}):`);
    console.log(`- Has code: ${code !== '0x' ? 'Yes' : 'No'}`);
    
    // Bear NFT
    code = await provider.getCode(BEAR_NFT_ADDRESS);
    console.log(`\nBear NFT (${BEAR_NFT_ADDRESS}):`);
    console.log(`- Has code: ${code !== '0x' ? 'Yes' : 'No'}`);
    
    // MiMo Token
    code = await provider.getCode(MIMO_TOKEN_ADDRESS);
    console.log(`\nMiMo Token (${MIMO_TOKEN_ADDRESS}):`);
    console.log(`- Has code: ${code !== '0x' ? 'Yes' : 'No'}`);
    
    // BTB Swap Logic
    code = await provider.getCode(BTB_SWAP_LOGIC_ADDRESS);
    console.log(`\nBTB Swap Logic (${BTB_SWAP_LOGIC_ADDRESS}):`);
    console.log(`- Has code: ${code !== '0x' ? 'Yes' : 'No'}`);
    
    // Try to verify if BTBSwapLogic is set in the BearHunterEcosystem
    try {
      // Get BTBSwapLogic address from the ecosystem
      let ecosystemBTBSwapAddress = "Unknown";
      try {
        const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
        if (code !== '0x') {
          ecosystemBTBSwapAddress = await ecosystemContract.btbSwapContract();
          console.log(`\nBTB Swap Logic address from ecosystem: ${ecosystemBTBSwapAddress}`);
          
          // Check if our config matches
          if(ecosystemBTBSwapAddress.toLowerCase() === BTB_SWAP_LOGIC_ADDRESS.toLowerCase()) {
            console.log(`- ✅ MATCH: Ecosystem's BTBSwapLogic matches our config`);
          } else {
            console.log(`- ❌ MISMATCH: Ecosystem's BTBSwapLogic does NOT match our config!`);
            console.log(`  Ecosystem points to: ${ecosystemBTBSwapAddress}`);
            console.log(`  Our config uses:    ${BTB_SWAP_LOGIC_ADDRESS}`);
            console.log(`  Updating our config to match ecosystem's address...`);
            
            // Update our variable to match the ecosystem's address
            deployedAddresses.BTB_SWAP_LOGIC_ADDRESS = ecosystemBTBSwapAddress;
            
            // Save the updated addresses to the JSON file
            fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(deployedAddresses, null, 2));
            console.log(`  Config updated in ${CONTRACTS_FILE}`);
            
            // Update our reference to use the correct address
            btbSwapLogic = await ethers.getContractAt("BTBSwapLogic", ecosystemBTBSwapAddress);
          }
          
          // Verify the BTBSwapLogic contract itself
          try {
            const swapLogicContract = await ethers.getContractAt("BTBSwapLogic", ecosystemBTBSwapAddress);
            
            // Try to call a function on the BTBSwapLogic contract
            const swapRate = await swapLogicContract.getSwapRate();
            console.log(`- BTBSwapLogic swap rate: ${ethers.formatEther(swapRate)} BTB per NFT`);
            
            // Try to get the owner of the BTBSwapLogic
            const swapLogicOwner = await swapLogicContract.owner();
            console.log(`- BTBSwapLogic owner: ${swapLogicOwner}`);
            
            // Check if ecosystem owns BTBSwapLogic
            if(swapLogicOwner.toLowerCase() === ECOSYSTEM_ADDRESS.toLowerCase()) {
              console.log(`- ✅ VERIFIED: BearHunterEcosystem owns the BTBSwapLogic contract`);
            } else {
              console.log(`- ❌ WARNING: BearHunterEcosystem is NOT the owner of BTBSwapLogic!`);
              console.log(`  BTBSwapLogic owner: ${swapLogicOwner}`);
              console.log(`  Expected owner:     ${ECOSYSTEM_ADDRESS}`);
            }
            
          } catch (error) {
            console.log(`- ❌ ERROR: Could not verify BTBSwapLogic functionality: ${error.message}`);
          }
        }
      } catch (error) {
        console.log(`\nCould not get BTB Swap Logic address from ecosystem: ${error.message}`);
      }
    } catch (error) {
      console.log(`Error verifying BTB Swap Logic connection: ${error.message}`);
    }
    
    console.log("\nChecking chain information...");
    const chainId = (await provider.getNetwork()).chainId;
    console.log(`- Connected to chain ID: ${chainId}`);
    
    if (chainId === 84532n) {
      console.log("- Successfully connected to Base Sepolia testnet");
    } else {
      console.log("- WARNING: Not connected to Base Sepolia (expected chain ID: 84532)");
    }
  }
  
  // New deployment function
  async function deployContracts() {
    console.log("\n===== DEPLOYING CONTRACTS =====");
    console.log("Deploying contracts with account:", signer.address);
    
    try {
      // Deploy BTBFinance token first
      console.log("\nDeploying BTB Token...");
      const BTBFinance = await ethers.getContractFactory("BTBFinance");
      const btbTokenContract = await BTBFinance.deploy(signer.address);
      await btbTokenContract.waitForDeployment();
      const btbTokenAddress = await btbTokenContract.getAddress();
      console.log("BTB Token deployed to:", btbTokenAddress);
      
      // Deploy BearNFT
      console.log("\nDeploying Bear NFT...");
      const BearNFT = await ethers.getContractFactory("BearNFT");
      const bearNFTContract = await BearNFT.deploy(signer.address);
      await bearNFTContract.waitForDeployment();
      const bearNFTAddress = await bearNFTContract.getAddress();
      console.log("Bear NFT deployed to:", bearNFTAddress);
      
      // Set payment token in BearNFT to use BTB
      const tokenPrice = ethers.parseEther("100"); // 100 BTB per NFT
      await bearNFTContract.setPaymentToken(btbTokenAddress, tokenPrice);
      console.log("Set BTB as payment token for BearNFT with price:", 
        ethers.formatEther(tokenPrice), "BTB");
      
      // Deploy MiMoGaMe token
      console.log("\nDeploying MiMo Token...");
      const MiMoGaMe = await ethers.getContractFactory("MiMoGaMe");
      const mimoTokenContract = await MiMoGaMe.deploy(signer.address, signer.address);
      await mimoTokenContract.waitForDeployment();
      const mimoTokenAddress = await mimoTokenContract.getAddress();
      console.log("MiMo Token deployed to:", mimoTokenAddress);
      
      // Deploy BearHunterEcosystem
      console.log("\nDeploying Bear Hunter Ecosystem...");
      const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
      const bearHunterEcosystem = await BearHunterEcosystem.deploy(
        bearNFTAddress,      // _bearNFT
        btbTokenAddress,     // _btbToken
        mimoTokenAddress,    // _mimoToken
        signer.address,      // _liquidityReceiver
        signer.address,      // _feeReceiver
        signer.address       // initialOwner
      );
      await bearHunterEcosystem.waitForDeployment();
      const ecosystemAddress = await bearHunterEcosystem.getAddress();
      console.log("BearHunterEcosystem deployed to:", ecosystemAddress);
      
      // Transfer ownership of MiMo token to the ecosystem contract
      await mimoTokenContract.transferOwnership(ecosystemAddress);
      console.log("MiMo token ownership transferred to BearHunterEcosystem");
      
      // Register BearHunterEcosystem with MiMoGaMe
      console.log("Initializing MiMo Game Contract...");
      const ecosystemContractInstance = await ethers.getContractAt(
        "BearHunterEcosystem", 
        ecosystemAddress
      );
      await ecosystemContractInstance.initializeMiMoGameContract();
      console.log("BearHunterEcosystem successfully registered as the game contract on MiMoGaMe");
      
      console.log("\n===== DEPLOYMENT SUCCESSFUL =====");
      console.log("BTB Token:", btbTokenAddress);
      console.log("Bear NFT:", bearNFTAddress);
      console.log("MiMo Token:", mimoTokenAddress);
      console.log("Game Ecosystem:", ecosystemAddress);
      
      // Get BTBSwapLogic address from the ecosystem contract
      const btbSwapAddress = await bearHunterEcosystem.btbSwapContract();
      console.log("BTB Swap Logic:", btbSwapAddress);
      
      // Save the deployed addresses to a file for future runs
      const newAddresses = {
        ECOSYSTEM_ADDRESS: ecosystemAddress,
        BTB_TOKEN_ADDRESS: btbTokenAddress,
        BEAR_NFT_ADDRESS: bearNFTAddress,
        MIMO_TOKEN_ADDRESS: mimoTokenAddress,
        BTB_SWAP_LOGIC_ADDRESS: btbSwapAddress
      };
      
      // Write the addresses to a JSON file
      fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(newAddresses, null, 2));
      console.log("Saved contract addresses to:", CONTRACTS_FILE);
      
      // Return the newly deployed addresses
      return {
        btbTokenAddress,
        bearNFTAddress,
        mimoTokenAddress,
        ecosystemAddress
      };
      
    } catch (error) {
      console.error("Error deploying contracts:", error);
      return null;
    }
  }
  
  // Function to verify BTBSwapLogic on blockchain explorer
  async function verifyBTBSwapLogicOnExplorer() {
    console.log("\n===== VERIFYING BTBSWAPLOGIC ON BLOCKCHAIN EXPLORER =====");
    
    try {
      // Get BTBSwapLogic address from the ecosystem contract
      const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      
      if (btbSwapLogicAddress === ethers.ZeroAddress) {
        console.error("BTBSwapLogic address is the zero address. Make sure BearHunterEcosystem is deployed and has set the address correctly.");
        return;
      }
      
      console.log(`Found BTBSwapLogic contract at: ${btbSwapLogicAddress}`);
      console.log("Verifying BTBSwapLogic on blockchain explorer...");
      
      // First determine the constructor arguments
      // Try to get the BTBSwapLogic contract owner
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      const owner = await btbSwapContract.owner();
      console.log(`BTBSwapLogic owner: ${owner}`);
      
      // Get BearNFT and BTBToken addresses from BTBSwapLogic
      const bearNFTFromSwap = await btbSwapContract.bearNFT();
      const btbTokenFromSwap = await btbSwapContract.btbToken();
      const feeReceiver = await btbSwapContract.feeReceiver();
      
      console.log(`BearNFT from BTBSwapLogic: ${bearNFTFromSwap}`);
      console.log(`BTBToken from BTBSwapLogic: ${btbTokenFromSwap}`);
      console.log(`Fee receiver from BTBSwapLogic: ${feeReceiver}`);
      
      console.log("\nAttempting verification with constructor arguments:");
      console.log("- Owner:", owner);
      console.log("- BearNFT:", bearNFTFromSwap);
      console.log("- BTBToken:", btbTokenFromSwap);
      console.log("- Fee Receiver:", feeReceiver);
      
      await hre.run("verify:verify", {
        address: btbSwapLogicAddress,
        constructorArguments: [
          owner,             // initialOwner 
          bearNFTFromSwap,   // _bearNFTAddress
          btbTokenFromSwap,  // _btbTokenAddress
          feeReceiver        // _feeReceiverAddress
        ]
      });
      
      console.log(`\nBTBSwapLogic at ${btbSwapLogicAddress} verification attempt submitted.`);
      
    } catch (error) {
      console.error("Error during verification:", error.message);
      if (error.message.toLowerCase().includes("already verified")) {
        console.log("BTBSwapLogic is already verified on the blockchain explorer.");
      }
    }
  }
  
  // Function to transfer BTBSwapLogic ownership to BearHunterEcosystem
  async function transferBTBSwapLogicOwnership() {
    console.log("\n===== TRANSFERRING BTBSWAPLOGIC OWNERSHIP =====");
    
    try {
      // Get BTBSwapLogic address from the ecosystem contract
      const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      
      if (btbSwapLogicAddress === ethers.ZeroAddress) {
        console.error("BTBSwapLogic address is the zero address. Make sure BearHunterEcosystem is deployed and has set the address correctly.");
        return;
      }
      
      console.log(`Found BTBSwapLogic contract at: ${btbSwapLogicAddress}`);
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      
      // Check current owner
      const currentOwner = await btbSwapContract.owner();
      console.log(`Current BTBSwapLogic owner: ${currentOwner}`);
      
      // Check if the current owner is the signer (otherwise we can't transfer)
      if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error(`Error: Current account (${signer.address}) is not the owner of BTBSwapLogic and cannot transfer ownership.`);
        return;
      }
      
      console.log(`Transferring ownership to BearHunterEcosystem (${ECOSYSTEM_ADDRESS})...`);
      
      // Transfer ownership to the ecosystem contract
      const tx = await btbSwapContract.transferOwnership(ECOSYSTEM_ADDRESS);
      const receipt = await tx.wait();
      
      console.log(`Ownership transfer transaction completed! Transaction hash: ${tx.hash}`);
      
      // Verify the ownership was transferred
      const newOwner = await btbSwapContract.owner();
      if (newOwner.toLowerCase() === ECOSYSTEM_ADDRESS.toLowerCase()) {
        console.log(`✅ SUCCESS: BTBSwapLogic ownership successfully transferred to BearHunterEcosystem!`);
      } else {
        console.log(`⚠️ WARNING: New owner is ${newOwner}, expected ${ECOSYSTEM_ADDRESS}`);
      }
      
    } catch (error) {
      console.error("Error transferring BTBSwapLogic ownership:", error.message);
    }
  }
  
  // Function to mint Bears and transfer BTB to BTBSwapLogic
  async function setupSwapLiquidity() {
    console.log("\n===== SETTING UP BTBSWAPLOGIC LIQUIDITY =====");
    
    try {
      // Get BTBSwapLogic address from the ecosystem contract
      const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      
      if (btbSwapLogicAddress === ethers.ZeroAddress) {
        console.error("BTBSwapLogic address is the zero address. Make sure BearHunterEcosystem is deployed and has set the address correctly.");
        return;
      }
      
      console.log(`Found BTBSwapLogic contract at: ${btbSwapLogicAddress}`);
      
      // Check current balances
      console.log("\nChecking current balances...");
      
      // Get BearNFT instance
      const bearNFTContract = await ethers.getContractAt("BearNFT", BEAR_NFT_ADDRESS);
      
      // Get BTB token instance  
      const btbTokenContract = await ethers.getContractAt("BTBFinance", BTB_TOKEN_ADDRESS);
      
      // Check BTBSwapLogic balances
      const swapBearBalance = await bearNFTContract.balanceOf(btbSwapLogicAddress);
      const swapBTBBalance = await btbTokenContract.balanceOf(btbSwapLogicAddress);
      
      console.log(`BTBSwapLogic has ${swapBearBalance} Bears and ${ethers.formatEther(swapBTBBalance)} BTB`);
      
      // Check signer balances
      const signerBearBalance = await bearNFTContract.balanceOf(signer.address);
      const signerBTBBalance = await btbTokenContract.balanceOf(signer.address);
      
      console.log(`Your account has ${signerBearBalance} Bears and ${ethers.formatEther(signerBTBBalance)} BTB`);
      
      // Ask for number of Bears to mint
      const bearsToMint = 10; // Set this to the number of Bears you want to mint
      console.log(`\nMinting ${bearsToMint} Bears...`);
      
      // Check if signer is owner of BearNFT contract
      const bearNFTOwner = await bearNFTContract.owner();
      if (bearNFTOwner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error(`Current account (${signer.address}) is not the owner of BearNFT and cannot mint.`);
        return;
      }
      
      // Mint Bears to BTBSwapLogic
      for (let i = 0; i < bearsToMint; i++) {
        console.log(`Minting Bear #${i+1}...`);
        const mintTx = await bearNFTContract.safeMint(btbSwapLogicAddress);
        await mintTx.wait();
      }
      
      // Check updated Bear balance of BTBSwapLogic
      const newSwapBearBalance = await bearNFTContract.balanceOf(btbSwapLogicAddress);
      console.log(`BTBSwapLogic now has ${newSwapBearBalance} Bears (added ${newSwapBearBalance - swapBearBalance})`);
      
      // Transfer BTB to BTBSwapLogic to establish price
      const btbToTransfer = ethers.parseEther("1000"); // Set this to the amount of BTB you want to transfer
      console.log(`\nTransferring ${ethers.formatEther(btbToTransfer)} BTB to BTBSwapLogic...`);
      
      // Check allowance
      const allowance = await btbTokenContract.allowance(signer.address, btbSwapLogicAddress);
      if (allowance < btbToTransfer) {
        console.log("Approving BTBSwapLogic to spend BTB...");
        const approveTx = await btbTokenContract.approve(btbSwapLogicAddress, btbToTransfer);
        await approveTx.wait();
      }
      
      // Transfer BTB
      const transferTx = await btbTokenContract.transfer(btbSwapLogicAddress, btbToTransfer);
      await transferTx.wait();
      
      // Check updated BTB balance of BTBSwapLogic
      const newSwapBTBBalance = await btbTokenContract.balanceOf(btbSwapLogicAddress);
      console.log(`BTBSwapLogic now has ${ethers.formatEther(newSwapBTBBalance)} BTB (added ${ethers.formatEther(newSwapBTBBalance - swapBTBBalance)})`);
      
      // Get the new swap rate
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      const swapRate = await btbSwapContract.getSwapRate();
      console.log(`\nCurrent swap rate: ${ethers.formatEther(swapRate)} BTB per Bear NFT`);
      
      console.log(`\n✅ BTBSwapLogic liquidity setup complete!`);
      
    } catch (error) {
      console.error("Error setting up BTBSwapLogic liquidity:", error.message);
    }
  }
  
  // Functions for batch swapping
  async function batchSwapBTBForBears() {
    console.log("\n===== BATCH SWAP BTB FOR MULTIPLE BEARS =====");
    
    try {
      // Get BTBSwapLogic address from the ecosystem contract
      const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      
      // Get the swap rate
      const swapRate = await btbSwapContract.getSwapRate();
      console.log(`Current swap rate: ${ethers.formatUnits(swapRate, 18)} BTB per Bear NFT`);
      
      // How many Bears to buy in batch
      const nftsToSwap = 5; // Change this to the number of Bears you want to buy
      console.log(`\nBatch swapping BTB for ${nftsToSwap} Bear NFTs...`);
      
      const totalSwapRate = swapRate * BigInt(nftsToSwap);
      // Add fee (estimated as 1% for this calculation)
      const estimatedFee = (totalSwapRate * BigInt(1)) / BigInt(100);
      const estimatedTotalCost = totalSwapRate + estimatedFee;
      
      console.log(`Estimated cost for ${nftsToSwap} Bear NFTs: ~${ethers.formatUnits(estimatedTotalCost, 18)} BTB (including fees)`);
      
      // Get BTB token instance
      const btbTokenContract = await ethers.getContractAt("BTBFinance", BTB_TOKEN_ADDRESS);
      
      // Check if user has enough BTB tokens
      const btbBalance = await btbTokenContract.balanceOf(signer.address);
      
      if (btbBalance < estimatedTotalCost) {
        console.log("\nInsufficient BTB tokens for batch swap.");
        console.log(`You have: ${ethers.formatUnits(btbBalance, 18)} BTB`);
        console.log(`Required: ~${ethers.formatUnits(estimatedTotalCost, 18)} BTB`);
        return;
      }
      
      // Check if allowance is set
      const allowance = await btbTokenContract.allowance(signer.address, btbSwapLogicAddress);
      
      if (allowance < estimatedTotalCost) {
        console.log("\nApproving BTB tokens for BTBSwapLogic...");
        // Approve a large amount to avoid future approvals
        const approveTx = await btbTokenContract.approve(btbSwapLogicAddress, ethers.parseEther("10000"));
        await approveTx.wait();
        console.log(`Approval transaction hash: ${approveTx.hash}`);
      }
      
      // Execute batch swap
      console.log("\nExecuting batch swap...");
      const batchSwapTx = await btbSwapContract.batchSwapBTBForNFT(signer.address, nftsToSwap);
      const receipt = await batchSwapTx.wait();
      console.log(`Batch swap transaction successful! Transaction hash: ${batchSwapTx.hash}`);
      
      // Check updated Bear NFT balance
      const bearNFTContract = await ethers.getContractAt("BearNFT", BEAR_NFT_ADDRESS);
      const newBearBalance = await bearNFTContract.balanceOf(signer.address);
      console.log(`\nYou now have ${newBearBalance} Bear NFTs`);
      
      // List the Bear NFT IDs
      if (newBearBalance > 0) {
        console.log("Your Bear NFT IDs:");
        for (let i = 0; i < 100; i++) {
          try {
            const owner = await bearNFTContract.ownerOf(i);
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
              console.log(`- Bear #${i}`);
            }
          } catch (e) {
            // Skip this ID if ownerOf fails
          }
        }
      }
      
      // Check updated BTB balance
      const newBTBBalance = await btbTokenContract.balanceOf(signer.address);
      console.log(`\nYou now have ${ethers.formatUnits(newBTBBalance, 18)} BTB tokens`);
      
    } catch (error) {
      console.error("Error in batch swap BTB for Bears:", error.message);
    }
  }
  
  async function batchSwapBearsForBTB() {
    console.log("\n===== BATCH SWAP MULTIPLE BEARS FOR BTB =====");
    
    try {
      // Get BTBSwapLogic address from the ecosystem contract
      const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      
      // Get Bear NFT instance
      const bearNFTContract = await ethers.getContractAt("BearNFT", BEAR_NFT_ADDRESS);
      
      // First check if user has any Bear NFTs
      const bearNFTBalance = await bearNFTContract.balanceOf(signer.address);
      
      if (bearNFTBalance == 0) {
        console.log("\nYou don't have any Bear NFTs to swap in batch.");
        return;
      }
      
      console.log(`You have ${bearNFTBalance} Bear NFTs to batch swap.`);
      
      // Get the swap rate to estimate return
      const swapRate = await btbSwapContract.getSwapRate();
      console.log(`Current swap rate: ${ethers.formatUnits(swapRate, 18)} BTB per Bear NFT`);
      
      // Collect all Bear NFT IDs owned by the user
      console.log("\nCollecting Bear NFT IDs owned by you...");
      let bearIds = [];
      for (let i = 0; i < 100; i++) {
        try {
          const owner = await bearNFTContract.ownerOf(i);
          if (owner.toLowerCase() === signer.address.toLowerCase()) {
            bearIds.push(i);
            console.log(`- Found Bear #${i}`);
          }
        } catch (e) {
          // Skip this ID if ownerOf fails
        }
      }
      
      if (bearIds.length === 0) {
        console.log("Couldn't find any Bear NFT IDs to swap.");
        return;
      }
      
      // Check if allowance is set
      const isApprovedForAll = await bearNFTContract.isApprovedForAll(signer.address, btbSwapLogicAddress);
      
      if (!isApprovedForAll) {
        console.log("\nApproving Bear NFTs for BTBSwapLogic...");
        // Approve for all to handle multiple swaps
        const approveTx = await bearNFTContract.setApprovalForAll(btbSwapLogicAddress, true);
        await approveTx.wait();
        console.log(`Approval transaction hash: ${approveTx.hash}`);
      }
      
      // Calculate expected return amount
      const totalReturnEstimate = swapRate * BigInt(bearIds.length);
      // Subtract fee (estimated as 1% for this calculation)
      const estimatedFee = (totalReturnEstimate * BigInt(1)) / BigInt(100);
      const estimatedReturn = totalReturnEstimate - estimatedFee;
      
      console.log(`\nEstimated return for ${bearIds.length} Bear NFTs: ~${ethers.formatUnits(estimatedReturn, 18)} BTB (after fees)`);
      
      // Execute batch swap
      console.log("\nExecuting batch swap of Bear NFTs for BTB...");
      const batchSwapTx = await btbSwapContract.swapNFTForBTB(signer.address, bearIds);
      const receipt = await batchSwapTx.wait();
      console.log(`Batch swap transaction successful! Transaction hash: ${batchSwapTx.hash}`);
      
      // Get BTB token instance
      const btbTokenContract = await ethers.getContractAt("BTBFinance", BTB_TOKEN_ADDRESS);
      
      // Check updated BTB balance
      const newBTBBalance = await btbTokenContract.balanceOf(signer.address);
      console.log(`\nYou now have ${ethers.formatUnits(newBTBBalance, 18)} BTB tokens`);
      
      // Check updated Bear NFT balance
      const newBearBalance = await bearNFTContract.balanceOf(signer.address);
      console.log(`You now have ${newBearBalance} Bear NFTs`);
      
    } catch (error) {
      console.error("Error in batch swap Bears for BTB:", error.message);
    }
  }
  
  // Function to swap BTB for specific Bear NFT
  async function swapBTBForSpecificNFT() {
    console.log("\n===== SWAP BTB FOR SPECIFIC BEAR NFT =====");
    
    try {
      // Get BTBSwapLogic address from the ecosystem contract
      const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      
      // Specific Bear NFT ID we want to target
      const targetNFTId = 7; // Change this to the specific Bear NFT ID you want
      console.log(`Targeting specific Bear NFT #${targetNFTId}`);
      
      // Check if the target NFT is owned by the BTBSwapLogic contract
      const bearNFTContract = await ethers.getContractAt("BearNFT", BEAR_NFT_ADDRESS);
      
      // Check if the target NFT exists and is owned by the BTBSwapLogic contract
      try {
        const owner = await bearNFTContract.ownerOf(targetNFTId);
        console.log(`Bear NFT #${targetNFTId} is owned by: ${owner}`);
        
        if (owner.toLowerCase() !== btbSwapLogicAddress.toLowerCase()) {
          console.log(`Error: Bear NFT #${targetNFTId} is not owned by the BTBSwapLogic contract.`);
          return;
        }
      } catch (error) {
        console.log(`Error: Bear NFT #${targetNFTId} does not exist or has an issue: ${error.message}`);
        return;
      }
      
      // Get the swap rate
      const swapRate = await btbSwapContract.getSwapRate();
      console.log(`Current swap rate: ${ethers.formatUnits(swapRate, 18)} BTB per Bear NFT`);
      
      // Calculate the cost
      // Add fee (estimated as 1% for this calculation)
      const estimatedFee = (swapRate * BigInt(1)) / BigInt(100);
      const estimatedTotalCost = swapRate + estimatedFee;
      
      console.log(`Estimated cost for Bear NFT #${targetNFTId}: ~${ethers.formatUnits(estimatedTotalCost, 18)} BTB (including fees)`);
      
      // Get BTB token instance
      const btbTokenContract = await ethers.getContractAt("BTBFinance", BTB_TOKEN_ADDRESS);
      
      // Check if user has enough BTB tokens
      const btbBalance = await btbTokenContract.balanceOf(signer.address);
      
      if (btbBalance < estimatedTotalCost) {
        console.log("\nInsufficient BTB tokens for swap.");
        console.log(`You have: ${ethers.formatUnits(btbBalance, 18)} BTB`);
        console.log(`Required: ~${ethers.formatUnits(estimatedTotalCost, 18)} BTB`);
        return;
      }
      
      // Check if allowance is set
      const allowance = await btbTokenContract.allowance(signer.address, btbSwapLogicAddress);
      
      if (allowance < estimatedTotalCost) {
        console.log("\nApproving BTB tokens for BTBSwapLogic...");
        // Approve a large amount to avoid future approvals
        const approveTx = await btbTokenContract.approve(btbSwapLogicAddress, ethers.parseEther("10000"));
        await approveTx.wait();
        console.log(`Approval transaction hash: ${approveTx.hash}`);
      }
      
      // Execute specific NFT swap
      console.log(`\nSwapping BTB for specific Bear NFT #${targetNFTId}...`);
      const specificSwapTx = await btbSwapContract.swapBTBForSpecificNFTs(signer.address, [targetNFTId]);
      const receipt = await specificSwapTx.wait();
      console.log(`Specific swap transaction successful! Transaction hash: ${specificSwapTx.hash}`);
      
      // Verify that we now own the target NFT
      try {
        const newOwner = await bearNFTContract.ownerOf(targetNFTId);
        if (newOwner.toLowerCase() === signer.address.toLowerCase()) {
          console.log(`\n✅ SUCCESS: You now own Bear NFT #${targetNFTId}!`);
        } else {
          console.log(`\n❌ ERROR: Bear NFT #${targetNFTId} is owned by ${newOwner}, not by you.`);
        }
      } catch (error) {
        console.log(`Error checking ownership after swap: ${error.message}`);
      }
      
      // Check updated BTB balance
      const newBTBBalance = await btbTokenContract.balanceOf(signer.address);
      console.log(`\nYou now have ${ethers.formatUnits(newBTBBalance, 18)} BTB tokens`);
      
    } catch (error) {
      console.error("Error swapping BTB for specific Bear NFT:", error.message);
    }
  }
  
  // Function to set and test high swap fees (80%)
  async function setHighSwapFees() {
    console.log("\n===== SETTING HIGH SWAP FEES (80%) =====");
    
    try {
      // Get ecosystem contract and BTBSwapLogic address
      const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      
      // Check current swap fee
      const currentSwapFee = await btbSwapContract.swapFeePercentage();
      console.log(`Current swap fee: ${currentSwapFee} basis points (${Number(currentSwapFee) / 100}%)`);
      
      // Set swap fee to 80% (8000 basis points) - IMPORTANT: Use the ecosystem contract
      const newFeePercentage = 8000; // 80% in basis points
      console.log(`\nSetting swap fee to ${newFeePercentage} basis points (${newFeePercentage / 100}%) through ecosystem contract...`);
      
      // Call setSwapFeePercentage through the ecosystem contract since it's the owner
      const setFeeTx = await ecosystemContract.setSwapFeePercentage(newFeePercentage);
      await setFeeTx.wait();
      console.log(`Transaction hash: ${setFeeTx.hash}`);
      
      // Verify new swap fee
      const newSwapFee = await btbSwapContract.swapFeePercentage();
      console.log(`\nNew swap fee: ${newSwapFee} basis points (${Number(newSwapFee) / 100}%)`);
      
      // Check the swap rate with the new fee
      const swapRate = await btbSwapContract.getSwapRate();
      console.log(`\nBase swap rate: ${ethers.formatUnits(swapRate, 18)} BTB per Bear NFT`);
      
      // Calculate the total cost with the high fee
      const baseAmount = swapRate;
      const feeAmount = (baseAmount * BigInt(newFeePercentage)) / BigInt(10000);
      const totalCost = baseAmount + feeAmount;
      
      console.log(`Fee amount: ${ethers.formatUnits(feeAmount, 18)} BTB (${newFeePercentage / 100}% of base rate)`);
      console.log(`Total cost with fee: ${ethers.formatUnits(totalCost, 18)} BTB`);
      
      // Now test buying a Bear with the high fee
      console.log("\n===== TESTING SWAP WITH HIGH FEE =====");
      
      // Get BTB token instance
      const btbTokenContract = await ethers.getContractAt("BTBFinance", BTB_TOKEN_ADDRESS);
      
      // Check if user has enough BTB tokens
      const btbBalance = await btbTokenContract.balanceOf(signer.address);
      console.log(`Current BTB balance: ${ethers.formatUnits(btbBalance, 18)} BTB`);
      
      if (btbBalance < totalCost) {
        console.log("\nInsufficient BTB tokens for swap with high fee.");
        console.log(`Required: ${ethers.formatUnits(totalCost, 18)} BTB`);
        return;
      }
      
      // Check if allowance is set - Important: approve both the BTBSwapLogic and Ecosystem
      const allowanceBTBSwap = await btbTokenContract.allowance(signer.address, btbSwapLogicAddress);
      const allowanceEcosystem = await btbTokenContract.allowance(signer.address, ECOSYSTEM_ADDRESS);
      
      if (allowanceBTBSwap < totalCost) {
        console.log("\nApproving BTB tokens for BTBSwapLogic...");
        // Approve a large amount to avoid future approvals
        const approveTx = await btbTokenContract.approve(btbSwapLogicAddress, ethers.parseEther("10000"));
        await approveTx.wait();
        console.log(`BTBSwapLogic approval transaction hash: ${approveTx.hash}`);
      }
      
      if (allowanceEcosystem < totalCost) {
        console.log("\nApproving BTB tokens for Ecosystem contract...");
        // Approve for ecosystem as well
        const approveEcoTx = await btbTokenContract.approve(ECOSYSTEM_ADDRESS, ethers.parseEther("10000"));
        await approveEcoTx.wait();
        console.log(`Ecosystem approval transaction hash: ${approveEcoTx.hash}`);
      }
      
      // Get Bear NFT contract
      const bearNFTContract = await ethers.getContractAt("BearNFT", BEAR_NFT_ADDRESS);
      
      // Check initial Bear NFT balance
      const initialBearBalance = await bearNFTContract.balanceOf(signer.address);
      console.log(`Initial Bear NFT balance: ${initialBearBalance}`);
      
      // Execute swap through the ecosystem contract (buy one Bear)
      console.log("\nSwapping BTB for a Bear NFT with 80% fee through ecosystem contract...");
      
      // Try using the ecosystem's swapBTBForNFT function
      let swapTx;
      try {
        console.log("Attempting swap through ecosystem contract...");
        swapTx = await ecosystemContract.swapBTBForNFT(swapRate);
        await swapTx.wait();
        console.log(`Ecosystem swap transaction successful! Transaction hash: ${swapTx.hash}`);
      } catch (error) {
        console.log(`Error swapping through ecosystem: ${error.message}`);
        console.log("Falling back to direct BTBSwapLogic contract...");
        
        swapTx = await btbSwapContract.swapBTBForNFT(signer.address, 1);
        await swapTx.wait();
        console.log(`Direct BTBSwapLogic swap transaction successful! Transaction hash: ${swapTx.hash}`);
      }
      
      // Check final Bear NFT balance
      const finalBearBalance = await bearNFTContract.balanceOf(signer.address);
      console.log(`Final Bear NFT balance: ${finalBearBalance}`);
      
      if (finalBearBalance > initialBearBalance) {
        console.log(`Successfully purchased ${finalBearBalance - initialBearBalance} Bear NFT(s) with 80% fee!`);
      } else {
        console.log("No new Bears were acquired. The swap might have failed silently.");
      }
      
      // Check final BTB balance
      const finalBTBBalance = await btbTokenContract.balanceOf(signer.address);
      console.log(`Final BTB balance: ${ethers.formatUnits(finalBTBBalance, 18)} BTB`);
      
      // Calculate actual cost
      const actualCost = btbBalance - finalBTBBalance;
      console.log(`\nActual cost: ${ethers.formatUnits(actualCost, 18)} BTB`);
      
      // Reset the fee back to a reasonable value (1%) through ecosystem
      console.log("\n===== RESETTING SWAP FEE TO 1% =====");
      const resetFeePercentage = 100; // 1% in basis points
      
      const resetFeeTx = await ecosystemContract.setSwapFeePercentage(resetFeePercentage);
      await resetFeeTx.wait();
      console.log(`Reset fee transaction hash: ${resetFeeTx.hash}`);
      
      // Verify reset swap fee
      const resetSwapFee = await btbSwapContract.swapFeePercentage();
      console.log(`\nReset swap fee: ${resetSwapFee} basis points (${Number(resetSwapFee) / 100}%)`);
      
    } catch (error) {
      console.error("Error setting or testing high swap fees:", error.message);
    }
  }
  
  // Function to withdraw Bear NFTs from BTBSwapLogic
  async function withdrawNFTsFromSwapModule() {
    console.log("\n===== WITHDRAWING BEAR NFTs FROM SWAP MODULE =====");
    
    try {
      // Get ecosystem contract
      const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      
      // Get Bear NFT contract
      const bearNFTContract = await ethers.getContractAt("BearNFT", BEAR_NFT_ADDRESS);
      
      // Check how many Bear NFTs the BTBSwapLogic contract has
      const swapBearBalance = await bearNFTContract.balanceOf(btbSwapLogicAddress);
      console.log(`BTBSwapLogic currently has ${swapBearBalance} Bear NFTs`);
      
      if (swapBearBalance.toString() === "0") {
        console.log("No Bear NFTs to withdraw. Aborting withdrawal.");
        return;
      }
      
      // Find specific Bear NFT IDs owned by the BTBSwapLogic contract
      console.log("\nSearching for Bear NFT IDs owned by BTBSwapLogic...");
      let bearIds = [];
      
      for (let i = 0; i < 20; i++) { // Check first 20 IDs for efficiency
        try {
          const owner = await bearNFTContract.ownerOf(i);
          if (owner.toLowerCase() === btbSwapLogicAddress.toLowerCase()) {
            bearIds.push(i);
            console.log(`- Found Bear #${i} owned by BTBSwapLogic`);
            
            // Limit to withdrawing just 1 for testing
            if (bearIds.length >= 1) break;
          }
        } catch (e) {
          // Skip this ID if ownerOf fails
        }
      }
      
      if (bearIds.length === 0) {
        console.log("Couldn't find any specific Bear NFT IDs to withdraw.");
        return;
      }
      
      // Withdraw specified Bear NFTs to the caller's address
      console.log(`\nWithdrawing ${bearIds.length} Bear NFTs from BTBSwapLogic to ${signer.address}...`);
      
      const withdrawTx = await ecosystemContract.withdrawNFTsFromSwapModule(signer.address, bearIds);
      await withdrawTx.wait();
      
      console.log(`Transaction hash: ${withdrawTx.hash}`);
      
      // Verify the Bear NFTs were transferred
      for (const bearId of bearIds) {
        try {
          const newOwner = await bearNFTContract.ownerOf(bearId);
          if (newOwner.toLowerCase() === signer.address.toLowerCase()) {
            console.log(`✅ Successfully withdrew Bear #${bearId} - New owner: ${newOwner}`);
          } else {
            console.log(`❌ Failed to withdraw Bear #${bearId} - Current owner: ${newOwner}`);
          }
        } catch (e) {
          console.log(`Error checking ownership of Bear #${bearId}: ${e.message}`);
        }
      }
      
      // Check final Bear NFT balance of BTBSwapLogic
      const finalSwapBearBalance = await bearNFTContract.balanceOf(btbSwapLogicAddress);
      console.log(`\nBTBSwapLogic now has ${finalSwapBearBalance} Bear NFTs (withdrew ${swapBearBalance - finalSwapBearBalance})`);
      
    } catch (error) {
      console.error("Error withdrawing Bear NFTs from swap module:", error.message);
    }
  }
  
  // Function to withdraw BTB tokens from BTBSwapLogic
  async function withdrawBTBFromSwapModule() {
    console.log("\n===== WITHDRAWING BTB TOKENS FROM SWAP MODULE =====");
    
    try {
      // Get ecosystem contract
      const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      
      // Get BTB token contract
      const btbTokenContract = await ethers.getContractAt("BTBFinance", BTB_TOKEN_ADDRESS);
      
      // Check how many BTB tokens the BTBSwapLogic contract has
      const swapBTBBalance = await btbTokenContract.balanceOf(btbSwapLogicAddress);
      console.log(`BTBSwapLogic currently has ${ethers.formatUnits(swapBTBBalance, 18)} BTB tokens`);
      
      if (swapBTBBalance.toString() === "0") {
        console.log("No BTB tokens to withdraw. Aborting withdrawal.");
        return;
      }
      
      // Calculate amount to withdraw (10% of balance for test)
      const withdrawAmount = swapBTBBalance / BigInt(10); // 10% of balance
      
      // Withdraw BTB tokens to the caller's address
      console.log(`\nWithdrawing ${ethers.formatUnits(withdrawAmount, 18)} BTB tokens from BTBSwapLogic to ${signer.address}...`);
      
      const initialUserBTBBalance = await btbTokenContract.balanceOf(signer.address);
      console.log(`Initial user BTB balance: ${ethers.formatUnits(initialUserBTBBalance, 18)}`);
      
      const withdrawTx = await ecosystemContract.withdrawBTBFromSwapModule(signer.address, withdrawAmount);
      await withdrawTx.wait();
      
      console.log(`Transaction hash: ${withdrawTx.hash}`);
      
      // Verify the BTB tokens were transferred
      const finalUserBTBBalance = await btbTokenContract.balanceOf(signer.address);
      const finalSwapBTBBalance = await btbTokenContract.balanceOf(btbSwapLogicAddress);
      
      console.log(`\nNew user BTB balance: ${ethers.formatUnits(finalUserBTBBalance, 18)}`);
      console.log(`BTB received: ${ethers.formatUnits(finalUserBTBBalance - initialUserBTBBalance, 18)}`);
      console.log(`BTBSwapLogic now has ${ethers.formatUnits(finalSwapBTBBalance, 18)} BTB tokens`);
      
    } catch (error) {
      console.error("Error withdrawing BTB tokens from swap module:", error.message);
    }
  }

  // Menu options
  const options = [
    { id: 0, name: "Verify Contracts" },
    { id: 10, name: "Verify BTBSwapLogic on Explorer" },
    { id: 11, name: "Transfer BTBSwapLogic Ownership to BearHunterEcosystem" },
    { id: 12, name: "Setup Swap Liquidity (Mint Bears + Transfer BTB)" },
    { id: 13, name: "Batch Swap BTB for Multiple Bears" },
    { id: 14, name: "Batch Swap Multiple Bears for BTB" },
    { id: 15, name: "Swap BTB for Specific Bear NFT" },
    { id: 16, name: "Set High Swap Fees (80%) and Test" },
    { id: 17, name: "Withdraw Bear NFTs from Swap Module" },
    { id: 18, name: "Withdraw BTB from Swap Module" },
    { id: 19, name: "Batch Deposit Bears for Hunters" },
    { id: 20, name: "Batch Redeem Bears with MiMo" },
    { id: 21, name: "Pause Ecosystem Functions" },
    { id: 22, name: "Unpause Ecosystem Functions" },
    { id: 9, name: "Deploy New Contracts" },
    { id: 1, name: "Check Hunter Stats" },
    { id: 2, name: "Feed Hunter" },
    { id: 3, name: "Hunt MiMo Tokens" },
    { id: 4, name: "Check Balances" },
    { id: 5, name: "Deposit Bear for Hunter" },
    { id: 6, name: "Redeem Bear NFT" },
    { id: 7, name: "Swap BTB for Bear NFT" },
    { id: 8, name: "Swap Bear NFT for BTB" }
  ];

  console.log("\n===== BEAR HUNTER ECOSYSTEM TESTER =====");
  console.log("Select a function to test:");
  
  options.forEach(option => {
    console.log(`${option.id}. ${option.name}`);
  });
  
  // Default option for demonstration
  const selectedOption = process.env.OPTION ? parseInt(process.env.OPTION) : 1;
  console.log(`\nSelected option: ${options.find(o => o.id === selectedOption).name}`);

  // Execute the selected function
  switch (selectedOption) {
    case 0:
      await verifyContracts();
      break;
    case 10:
      await verifyBTBSwapLogicOnExplorer();
      break;
    case 11:
      await transferBTBSwapLogicOwnership();
      break;
    case 12:
      await setupSwapLiquidity();
      break;
    case 13:
      await batchSwapBTBForBears();
      break;
    case 14:
      await batchSwapBearsForBTB();
      break;
    case 15:
      await swapBTBForSpecificNFT();
      break;
    case 16:
      await setHighSwapFees();
      break;
    case 17:
      await withdrawNFTsFromSwapModule();
      break;
    case 18:
      await withdrawBTBFromSwapModule();
      break;
    case 19:
      await batchDepositBears(gameContract, bearNFT, signer);
      break;
    case 20:
      await batchRedeemBears(gameContract, mimoToken, signer);
      break;
    case 21:
      await pauseEcosystem();
      break;
    case 22:
      await unpauseEcosystem();
      break;
    case 9:
      // Deploy new contracts and update our references
      const deployedContracts = await deployContracts();
      if (deployedContracts) {
        console.log("\nUpdating contract references to use newly deployed contracts...");
        // Update our contract instances with the newly deployed addresses
        btbToken = await ethers.getContractAt("IERC20", deployedContracts.btbTokenAddress);
        bearNFT = await ethers.getContractAt("IERC721", deployedContracts.bearNFTAddress);
        mimoToken = await ethers.getContractAt("MiMoGaMe", deployedContracts.mimoTokenAddress);
        gameContract = await ethers.getContractAt("BearHunterEcosystem", deployedContracts.ecosystemAddress);
        
        console.log("Contract references updated successfully!");
      }
      break;
    case 1:
      await checkHunterStats(gameContract);
      break;
    case 2:
      await feedHunter(gameContract);
      break;
    case 3:
      await huntMiMo(gameContract);
      break;
    case 4:
      await checkBalances(btbToken, bearNFT, mimoToken, signer, gameContract);
      break;
    case 5:
      await depositBear(gameContract, bearNFT, signer);
      break;
    case 6:
      await redeemBear(gameContract, mimoToken, signer);
      break;
    case 7:
      await swapBTBForNFT(gameContract, btbToken, signer);
      break;
    case 8:
      await swapNFTForBTB(gameContract, bearNFT, signer);
      break;
    default:
      console.log("Invalid option selected.");
  }
}

// Function 1: Check Hunter Stats
async function checkHunterStats(gameContract) {
  try {
    console.log(`\nChecking stats for Hunter #${HUNTER_NFT_ID}...`);
    
    // Get hunter stats
    const stats = await gameContract.getHunterStats(HUNTER_NFT_ID);
    
    console.log("\n===== HUNTER STATS =====");
    console.log(`Power: ${ethers.formatEther(stats.power)} (${stats.power.toString()})`);
    console.log(`Creation Time: ${new Date(Number(stats.creationTime) * 1000).toLocaleString()}`);
    console.log(`Last Feed Time: ${new Date(Number(stats.lastFeedTime) * 1000).toLocaleString()}`);
    console.log(`Last Hunt Time: ${new Date(Number(stats.lastHuntTime) * 1000).toLocaleString()}`);
    console.log(`Missed Feedings: ${Number(stats.missedFeedings)}`);
    console.log(`In Hibernation: ${stats.inHibernation}`);
    console.log(`Recovery Start Time: ${Number(stats.recoveryStartTime) > 0 ? new Date(Number(stats.recoveryStartTime) * 1000).toLocaleString() : 'N/A'}`);
    console.log(`Total Hunted: ${ethers.formatEther(stats.totalHunted)} (${stats.totalHunted.toString()})`);
    console.log(`Days Remaining: ${Number(stats.daysRemaining)}`);
    
    // Check if hunter can hunt
    const [canHunt, huntReason] = await gameContract.canHunt(HUNTER_NFT_ID);
    console.log(`\nCan Hunt: ${canHunt ? "Yes" : "No"}`);
    if (!canHunt) console.log(`Reason: ${huntReason}`);
    
    // Check if hunter can feed
    const [canFeed, feedReason] = await gameContract.canFeed(HUNTER_NFT_ID);
    console.log(`Can Feed: ${canFeed ? "Yes" : "No"}`);
    if (!canFeed) console.log(`Reason: ${feedReason}`);
    
    // Check if hunter is active
    const isActive = await gameContract.isHunterActive(HUNTER_NFT_ID);
    console.log(`Is Active: ${isActive}`);
    
  } catch (error) {
    console.error("Error checking hunter stats:", error.message);
  }
}

// Function 2: Feed Hunter
async function feedHunter(gameContract) {
  try {
    // Check if can feed first
    const [canFeed, reason] = await gameContract.canFeed(HUNTER_NFT_ID);
    console.log(`\nCan feed Hunter #${HUNTER_NFT_ID}? ${canFeed ? "Yes" : "No"}`);
    
    if (!canFeed) {
      console.log(`Reason: ${reason}`);
      return;
    }
    
    // Get hunter stats before feeding
    const beforeStats = await gameContract.getHunterStats(HUNTER_NFT_ID);
    console.log("\nHunter stats before feeding:");
    console.log(`Power: ${beforeStats.power}`);
    console.log(`Last Feed Time: ${new Date(beforeStats.lastFeedTime * 1000).toLocaleString()}`);
    
    // Feed the hunter
    console.log("\nFeeding hunter...");
    const feedTx = await gameContract.feedHunter(HUNTER_NFT_ID);
    await feedTx.wait();
    console.log(`Transaction hash: ${feedTx.hash}`);
    
    // Get hunter stats after feeding
    const afterStats = await gameContract.getHunterStats(HUNTER_NFT_ID);
    console.log("\nHunter stats after feeding:");
    console.log(`Power: ${afterStats.power}`);
    console.log(`Last Feed Time: ${new Date(afterStats.lastFeedTime * 1000).toLocaleString()}`);
    
    // Calculate power increase
    const powerIncrease = afterStats.power - beforeStats.power;
    console.log(`\nPower increased by: ${powerIncrease} (${(powerIncrease * 100 / beforeStats.power).toFixed(2)}%)`);
    
  } catch (error) {
    console.error("Error feeding hunter:", error.message);
  }
}

// Function 3: Hunt MiMo Tokens
async function huntMiMo(gameContract) {
  try {
    // Check if can hunt first
    const [canHunt, reason] = await gameContract.canHunt(HUNTER_NFT_ID);
    console.log(`\nCan hunt with Hunter #${HUNTER_NFT_ID}? ${canHunt ? "Yes" : "No"}`);
    
    if (!canHunt) {
      console.log(`Reason: ${reason}`);
      return;
    }
    
    // Get hunter stats before hunting
    const beforeStats = await gameContract.getHunterStats(HUNTER_NFT_ID);
    console.log("\nHunter stats before hunting:");
    console.log(`Power: ${beforeStats.power}`);
    console.log(`Last Hunt Time: ${new Date(beforeStats.lastHuntTime * 1000).toLocaleString()}`);
    console.log(`Total Hunted: ${beforeStats.totalHunted}`);
    
    // Hunt from your own address (simplest test case)
    console.log("\nHunting from own address...");
    const huntTx = await gameContract.hunt(HUNTER_NFT_ID, ethers.ZeroAddress);
    await huntTx.wait();
    console.log(`Transaction hash: ${huntTx.hash}`);
    
    // Get hunter stats after hunting
    const afterStats = await gameContract.getHunterStats(HUNTER_NFT_ID);
    console.log("\nHunter stats after hunting:");
    console.log(`Power: ${afterStats.power}`);
    console.log(`Last Hunt Time: ${new Date(afterStats.lastHuntTime * 1000).toLocaleString()}`);
    console.log(`Total Hunted: ${afterStats.totalHunted}`);
    
    // Calculate tokens hunted
    const tokensHunted = afterStats.totalHunted - beforeStats.totalHunted;
    console.log(`\nTokens hunted: ${tokensHunted}`);
    
  } catch (error) {
    console.error("Error hunting MiMo tokens:", error.message);
  }
}

// Function 4: Check Balances
async function checkBalances(btbToken, bearNFT, mimoToken, signer, gameContract) {
  try {
    const btbBalance = await btbToken.balanceOf(signer.address);
    const mimoBalance = await mimoToken.balanceOf(signer.address);
    
    console.log("\n===== ACCOUNT BALANCES =====");
    console.log(`BTB Token: ${ethers.formatUnits(btbBalance, 18)}`);
    console.log(`MiMo Token: ${ethers.formatUnits(mimoBalance, 18)}`);
    
    // Check if account has any Bear NFTs
    try {
      const bearNFTBalance = await bearNFT.balanceOf(signer.address);
      console.log(`Bear NFTs: ${bearNFTBalance}`);
      
      if (bearNFTBalance > 0) {
        console.log("\nBear NFT IDs:");
        // This is a simple approach that works for small numbers of NFTs
        let nftIds = [];
        for (let i = 0; i < 100; i++) { // Check first 100 possible IDs
          try {
            const owner = await bearNFT.ownerOf(i);
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
              nftIds.push(i);
            }
          } catch (e) {
            // Skip this ID if ownerOf fails
          }
        }
        console.log(nftIds.join(", "));
      }
    } catch (error) {
      console.log("Error checking Bear NFT balance:", error.message);
    }
    
    // Check Hunter NFTs
    try {
      const hunterBalance = await gameContract.balanceOf(signer.address);
      console.log(`Hunter NFTs: ${hunterBalance}`);
      
      if (hunterBalance > 0) {
        console.log("\nHunter NFT IDs:");
        // This is a simple approach that works for small numbers of NFTs
        let nftIds = [];
        for (let i = 0; i < 100; i++) { // Check first 100 possible IDs
          try {
            const owner = await gameContract.ownerOf(i);
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
              nftIds.push(i);
            }
          } catch (e) {
            // Skip this ID if ownerOf fails
          }
        }
        console.log(nftIds.join(", "));
      }
    } catch (error) {
      console.log("Error checking Hunter NFT balance:", error.message);
    }
    
  } catch (error) {
    console.error("Error checking balances:", error.message);
  }
}

// Function 5: Deposit Bear for Hunter
async function depositBear(gameContract, bearNFT, signer) {
  try {
    // First check if user has any Bear NFTs
    const bearNFTBalance = await bearNFT.balanceOf(signer.address);
    
    if (bearNFTBalance == 0) {
      console.log("\nYou don't have any Bear NFTs to deposit.");
      return;
    }
    
    // Get the first Bear NFT ID the user owns
    let bearId = null;
    for (let i = 0; i < 100; i++) { // Check first 100 possible IDs
      try {
        const owner = await bearNFT.ownerOf(i);
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          bearId = i;
          break;
        }
      } catch (e) {
        // Skip this ID if ownerOf fails
      }
    }
    
    if (bearId === null) {
      console.log("\nCouldn't find a Bear NFT ID to deposit.");
      return;
    }
    
    // Check if allowance is set
    const isApproved = await bearNFT.isApprovedForAll(signer.address, ECOSYSTEM_ADDRESS) ||
                       await bearNFT.getApproved(bearId) === ECOSYSTEM_ADDRESS;
    
    if (!isApproved) {
      console.log("\nApproving Bear NFT for transfer...");
      const approveTx = await bearNFT.approve(ECOSYSTEM_ADDRESS, bearId);
      await approveTx.wait();
      console.log(`Approval transaction hash: ${approveTx.hash}`);
    }
    
    console.log(`\nDepositing Bear NFT #${bearId}...`);
    const depositTx = await gameContract.depositBear(bearId);
    await depositTx.wait();
    console.log(`Deposit transaction hash: ${depositTx.hash}`);
    
    console.log("\nBear NFT deposited successfully!");
    console.log("You should have received a Hunter NFT and MiMo tokens.");
    
  } catch (error) {
    console.error("Error depositing Bear NFT:", error.message);
  }
}

// Function 5b: Batch Deposit Bears
async function batchDepositBears(gameContract, bearNFT, signer) {
  try {
    console.log("\n===== BATCH DEPOSIT BEAR NFTs =====");
    
    // First check if user has any Bear NFTs
    const bearNFTBalance = await bearNFT.balanceOf(signer.address);
    
    if (bearNFTBalance == 0) {
      console.log("\nYou don't have any Bear NFTs to deposit.");
      return;
    }
    
    console.log(`You have ${bearNFTBalance} Bear NFTs to deposit.`);
    
    // Collect all Bear NFT IDs owned by the user
    console.log("\nCollecting Bear NFT IDs owned by you...");
    let bearIds = [];
    for (let i = 0; i < 100; i++) {
      try {
        const owner = await bearNFT.ownerOf(i);
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          bearIds.push(i);
          console.log(`- Found Bear #${i} owned by you`);
        }
      } catch (e) {
        // Skip this ID if ownerOf fails
      }
    }
    
    if (bearIds.length === 0) {
      console.log("Couldn't find any Bear NFT IDs to deposit.");
      return;
    }
    
    // Check if approval is needed
    const isApprovedForAll = await bearNFT.isApprovedForAll(signer.address, ECOSYSTEM_ADDRESS);
    
    if (!isApprovedForAll) {
      console.log("\nApproving all Bear NFTs for transfer...");
      const approveTx = await bearNFT.setApprovalForAll(ECOSYSTEM_ADDRESS, true);
      await approveTx.wait();
      console.log(`Approval transaction hash: ${approveTx.hash}`);
    }
    
    // Batch deposit all Bears
    console.log(`\nBatch depositing ${bearIds.length} Bear NFTs...`);
    const depositTx = await gameContract.batchDepositBears(bearIds);
    const receipt = await depositTx.wait();
    console.log(`Batch deposit transaction hash: ${depositTx.hash}`);
    
    // Check how many Hunter NFTs were created
    const hunterBalance = await gameContract.balanceOf(signer.address);
    
    console.log(`\nBatch deposit successful! You now have ${hunterBalance} Hunter NFTs.`);
    console.log(`You should have received ${bearIds.length} new Hunter NFTs and ${bearIds.length * 1000000} MiMo tokens.`);
    
    // Check for emitted events to get the Hunter NFT IDs (optional)
    try {
      if (receipt && receipt.logs) {
        console.log("\nNewly created Hunter NFT IDs:");
        for (const log of receipt.logs) {
          // Try to parse the Transfer event (ERC721 token minting)
          if (log.topics && log.topics[0] === ethers.id("Transfer(address,address,uint256)") && 
              log.topics[1] === ethers.ZeroHash) {
            const tokenId = parseInt(log.topics[3], 16);
            console.log(`- Hunter #${tokenId}`);
          }
        }
      }
    } catch (e) {
      console.log("Could not parse Hunter NFT IDs from events:", e.message);
    }
    
  } catch (error) {
    console.error("Error batch depositing Bear NFTs:", error.message);
  }
}

// Function 6a: Redeem Bear NFT
async function redeemBear(gameContract, mimoToken, signer) {
  try {
    // Check if user has enough MiMo tokens
    const mimoBalance = await mimoToken.balanceOf(signer.address);
    const requiredAmount = ethers.parseUnits("1100000", 18); // 1.1M MiMo (1M + 10% fee)
    
    if (mimoBalance < requiredAmount) {
      console.log("\nInsufficient MiMo tokens for redemption.");
      console.log(`You have: ${ethers.formatUnits(mimoBalance, 18)} MiMo`);
      console.log(`Required: ${ethers.formatUnits(requiredAmount, 18)} MiMo`);
      return;
    }
    
    // Check if allowance is set
    const allowance = await mimoToken.allowance(signer.address, ECOSYSTEM_ADDRESS);
    
    if (allowance < requiredAmount) {
      console.log("\nApproving MiMo tokens for transfer...");
      const approveTx = await mimoToken.approve(ECOSYSTEM_ADDRESS, requiredAmount);
      await approveTx.wait();
      console.log(`Approval transaction hash: ${approveTx.hash}`);
    }
    
    console.log("\nRedeeming Bear NFT...");
    const redeemTx = await gameContract.redeemBear();
    await redeemTx.wait();
    console.log(`Redemption transaction hash: ${redeemTx.hash}`);
    
    console.log("\nBear NFT redeemed successfully!");
    
  } catch (error) {
    console.error("Error redeeming Bear NFT:", error.message);
  }
}

// Function for pausing the ecosystem
async function pauseEcosystem() {
  try {
    console.log("\n===== PAUSING BEAR HUNTER ECOSYSTEM =====");
    
    // Get ecosystem contract
    const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
    
    // Check current pause states
    let isPaused = false;
    try {
      isPaused = await ecosystemContract.paused();
    } catch (e) {
      console.log("Could not check global pause state, continuing...");
    }
    
    console.log(`Current global pause state: ${isPaused ? "PAUSED" : "NOT PAUSED"}`);
    
    // Check deposit paused state
    let depositPaused = false;
    try {
      depositPaused = await ecosystemContract.depositPaused();
    } catch (e) {
      console.log("Could not check deposit pause state, continuing...");
    }
    
    console.log(`Current deposit pause state: ${depositPaused ? "PAUSED" : "NOT PAUSED"}`);
    
    // Check redemption paused state
    let redemptionPaused = false;
    try {
      redemptionPaused = await ecosystemContract.redemptionPaused();
    } catch (e) {
      console.log("Could not check redemption pause state, continuing...");
    }
    
    console.log(`Current redemption pause state: ${redemptionPaused ? "PAUSED" : "NOT PAUSED"}`);
    
    // Get BTBSwapLogic pause state
    let swapPaused = false;
    try {
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      swapPaused = await btbSwapContract.swapPausedState();
    } catch (e) {
      console.log("Could not check swap pause state, continuing...");
    }
    
    console.log(`Current swap pause state: ${swapPaused ? "PAUSED" : "NOT PAUSED"}`);
    
    // Pause global ecosystem
    if (!isPaused) {
      console.log("\nPausing global ecosystem...");
      try {
        const pauseTx = await ecosystemContract.pause();
        await pauseTx.wait();
        console.log(`Transaction hash: ${pauseTx.hash}`);
        
        // Verify new state
        isPaused = await ecosystemContract.paused();
        console.log(`New global pause state: ${isPaused ? "PAUSED" : "NOT PAUSED"}`);
      } catch (e) {
        console.error(`Error pausing global ecosystem: ${e.message}`);
      }
    } else {
      console.log("\nGlobal ecosystem is already paused.");
    }
    
    // Set deposit paused
    if (!depositPaused) {
      console.log("\nSetting deposit paused...");
      try {
        const setDepositPausedTx = await ecosystemContract.setDepositPaused(true);
        await setDepositPausedTx.wait();
        console.log(`Transaction hash: ${setDepositPausedTx.hash}`);
        
        // Verify new state
        depositPaused = await ecosystemContract.depositPaused();
        console.log(`New deposit pause state: ${depositPaused ? "PAUSED" : "NOT PAUSED"}`);
      } catch (e) {
        console.error(`Error setting deposit paused: ${e.message}`);
      }
    } else {
      console.log("\nDeposit is already paused.");
    }
    
    // Set redemption paused
    if (!redemptionPaused) {
      console.log("\nSetting redemption paused...");
      try {
        const setRedemptionPausedTx = await ecosystemContract.setRedemptionPaused(true);
        await setRedemptionPausedTx.wait();
        console.log(`Transaction hash: ${setRedemptionPausedTx.hash}`);
        
        // Verify new state
        redemptionPaused = await ecosystemContract.redemptionPaused();
        console.log(`New redemption pause state: ${redemptionPaused ? "PAUSED" : "NOT PAUSED"}`);
      } catch (e) {
        console.error(`Error setting redemption paused: ${e.message}`);
      }
    } else {
      console.log("\nRedemption is already paused.");
    }
    
    // Set swap paused
    if (!swapPaused) {
      console.log("\nSetting swap paused...");
      try {
        const setSwapPausedTx = await ecosystemContract.setSwapPaused(true);
        await setSwapPausedTx.wait();
        console.log(`Transaction hash: ${setSwapPausedTx.hash}`);
        
        // Verify new state
        const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
        const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
        swapPaused = await btbSwapContract.swapPausedState();
        console.log(`New swap pause state: ${swapPaused ? "PAUSED" : "NOT PAUSED"}`);
      } catch (e) {
        console.error(`Error setting swap paused: ${e.message}`);
      }
    } else {
      console.log("\nSwap is already paused.");
    }
    
    console.log("\n===== ECOSYSTEM PAUSE OPERATIONS COMPLETE =====");
    
  } catch (error) {
    console.error("Error pausing ecosystem:", error.message);
  }
}

// Function for unpausing the ecosystem
async function unpauseEcosystem() {
  try {
    console.log("\n===== UNPAUSING BEAR HUNTER ECOSYSTEM =====");
    
    // Get ecosystem contract
    const ecosystemContract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
    
    // Check current pause states
    let isPaused = false;
    try {
      isPaused = await ecosystemContract.paused();
    } catch (e) {
      console.log("Could not check global pause state, continuing...");
    }
    
    console.log(`Current global pause state: ${isPaused ? "PAUSED" : "NOT PAUSED"}`);
    
    // Check deposit paused state
    let depositPaused = false;
    try {
      depositPaused = await ecosystemContract.depositPaused();
    } catch (e) {
      console.log("Could not check deposit pause state, continuing...");
    }
    
    console.log(`Current deposit pause state: ${depositPaused ? "PAUSED" : "NOT PAUSED"}`);
    
    // Check redemption paused state
    let redemptionPaused = false;
    try {
      redemptionPaused = await ecosystemContract.redemptionPaused();
    } catch (e) {
      console.log("Could not check redemption pause state, continuing...");
    }
    
    console.log(`Current redemption pause state: ${redemptionPaused ? "PAUSED" : "NOT PAUSED"}`);
    
    // Get BTBSwapLogic pause state
    let swapPaused = false;
    try {
      const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
      const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
      swapPaused = await btbSwapContract.swapPausedState();
    } catch (e) {
      console.log("Could not check swap pause state, continuing...");
    }
    
    console.log(`Current swap pause state: ${swapPaused ? "PAUSED" : "NOT PAUSED"}`);
    
    // Unpause global ecosystem
    if (isPaused) {
      console.log("\nUnpausing global ecosystem...");
      try {
        const unpauseTx = await ecosystemContract.unpause();
        await unpauseTx.wait();
        console.log(`Transaction hash: ${unpauseTx.hash}`);
        
        // Verify new state
        isPaused = await ecosystemContract.paused();
        console.log(`New global pause state: ${isPaused ? "PAUSED" : "NOT PAUSED"}`);
      } catch (e) {
        console.error(`Error unpausing global ecosystem: ${e.message}`);
      }
    } else {
      console.log("\nGlobal ecosystem is already unpaused.");
    }
    
    // Set deposit unpaused
    if (depositPaused) {
      console.log("\nSetting deposit unpaused...");
      try {
        const setDepositPausedTx = await ecosystemContract.setDepositPaused(false);
        await setDepositPausedTx.wait();
        console.log(`Transaction hash: ${setDepositPausedTx.hash}`);
        
        // Verify new state
        depositPaused = await ecosystemContract.depositPaused();
        console.log(`New deposit pause state: ${depositPaused ? "PAUSED" : "NOT PAUSED"}`);
      } catch (e) {
        console.error(`Error setting deposit unpaused: ${e.message}`);
      }
    } else {
      console.log("\nDeposit is already unpaused.");
    }
    
    // Set redemption unpaused
    if (redemptionPaused) {
      console.log("\nSetting redemption unpaused...");
      try {
        const setRedemptionPausedTx = await ecosystemContract.setRedemptionPaused(false);
        await setRedemptionPausedTx.wait();
        console.log(`Transaction hash: ${setRedemptionPausedTx.hash}`);
        
        // Verify new state
        redemptionPaused = await ecosystemContract.redemptionPaused();
        console.log(`New redemption pause state: ${redemptionPaused ? "PAUSED" : "NOT PAUSED"}`);
      } catch (e) {
        console.error(`Error setting redemption unpaused: ${e.message}`);
      }
    } else {
      console.log("\nRedemption is already unpaused.");
    }
    
    // Set swap unpaused
    if (swapPaused) {
      console.log("\nSetting swap unpaused...");
      try {
        const setSwapPausedTx = await ecosystemContract.setSwapPaused(false);
        await setSwapPausedTx.wait();
        console.log(`Transaction hash: ${setSwapPausedTx.hash}`);
        
        // Verify new state
        const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
        const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
        swapPaused = await btbSwapContract.swapPausedState();
        console.log(`New swap pause state: ${swapPaused ? "PAUSED" : "NOT PAUSED"}`);
      } catch (e) {
        console.error(`Error setting swap unpaused: ${e.message}`);
      }
    } else {
      console.log("\nSwap is already unpaused.");
    }
    
    console.log("\n===== ECOSYSTEM UNPAUSE OPERATIONS COMPLETE =====");
    
  } catch (error) {
    console.error("Error unpausing ecosystem:", error.message);
  }
}

// Function 6b: Batch Redeem Bears
async function batchRedeemBears(gameContract, mimoToken, signer) {
  try {
    console.log("\n===== BATCH REDEEM BEAR NFTs =====");
    
    // How many Bears to redeem in batch
    const count = 2; // We'll redeem 2 Bears in this test
    
    // Calculate total amount needed (base amount + fee) for all NFTs
    const feeAmountPerNFT = ethers.parseUnits("100000", 18); // 10% fee on 1M MiMo
    const baseAmountPerNFT = ethers.parseUnits("1000000", 18); // 1M MiMo per NFT
    const totalAmountPerNFT = baseAmountPerNFT + feeAmountPerNFT; // 1.1M MiMo per NFT
    const totalAmountRequired = totalAmountPerNFT * BigInt(count); // Total for all NFTs
    
    console.log(`Redeeming ${count} Bear NFTs will cost ${ethers.formatUnits(totalAmountRequired, 18)} MiMo tokens`);
    
    // Check if user has enough MiMo tokens
    const mimoBalance = await mimoToken.balanceOf(signer.address);
    console.log(`Current MiMo balance: ${ethers.formatUnits(mimoBalance, 18)}`);
    
    if (mimoBalance < totalAmountRequired) {
      console.log(`\nInsufficient MiMo tokens for batch redemption.`);
      console.log(`Required: ${ethers.formatUnits(totalAmountRequired, 18)} MiMo`);
      console.log(`Available: ${ethers.formatUnits(mimoBalance, 18)} MiMo`);
      return;
    }
    
    // Check if allowance is set
    const allowance = await mimoToken.allowance(signer.address, ECOSYSTEM_ADDRESS);
    
    if (allowance < totalAmountRequired) {
      console.log("\nApproving MiMo tokens for transfer...");
      const approveTx = await mimoToken.approve(ECOSYSTEM_ADDRESS, ethers.parseUnits("10000000", 18)); // Approve a large amount
      await approveTx.wait();
      console.log(`Approval transaction hash: ${approveTx.hash}`);
    }
    
    console.log("\nBatch redeeming Bear NFTs...");
    const redeemTx = await gameContract.batchRedeemBears(count);
    const receipt = await redeemTx.wait();
    console.log(`Batch redemption transaction hash: ${redeemTx.hash}`);
    
    // Get our Bear NFT balance after redemption
    const bearNFTContract = await ethers.getContractAt("IERC721", BEAR_NFT_ADDRESS);
    const bearNFTBalance = await bearNFTContract.balanceOf(signer.address);
    
    console.log(`\nBatch redemption successful!`);
    console.log(`You now have ${bearNFTBalance} Bear NFTs`);
    
    // List the Bear NFT IDs
    console.log("Your Bear NFT IDs:");
    for (let i = 0; i < 20; i++) {
      try {
        const owner = await bearNFTContract.ownerOf(i);
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          console.log(`- Bear #${i}`);
        }
      } catch (e) {
        // Skip this ID if ownerOf fails
      }
    }
    
    // Check MiMo balance after redemption
    const newMimoBalance = await mimoToken.balanceOf(signer.address);
    console.log(`\nMiMo balance after redemption: ${ethers.formatUnits(newMimoBalance, 18)}`);
    console.log(`MiMo spent: ${ethers.formatUnits(mimoBalance - newMimoBalance, 18)}`);
    
  } catch (error) {
    console.error("Error batch redeeming Bear NFTs:", error.message);
  }
}

// Function 7: Swap BTB for Bear NFT
async function swapBTBForNFT(gameContract, btbToken, signer) {
  try {
    // Get BTBSwapLogic address from the ecosystem contract
    const btbSwapLogicAddress = await gameContract.btbSwapContract();
    const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
    
    // Get the swap rate
    const swapRate = await btbSwapContract.getSwapRate();
    console.log(`\nCurrent swap rate: ${ethers.formatUnits(swapRate, 18)} BTB per Bear NFT`);
    
    // How many NFTs to buy
    const nftsToSwap = 1;
    const totalSwapRate = swapRate * BigInt(nftsToSwap);
    // Add fee (estimated as 1% for this calculation)
    const estimatedFee = (totalSwapRate * BigInt(1)) / BigInt(100);
    const estimatedTotalCost = totalSwapRate + estimatedFee;
    
    console.log(`Estimated cost for ${nftsToSwap} Bear NFT: ~${ethers.formatUnits(estimatedTotalCost, 18)} BTB (including fees)`);
    
    // Check if user has enough BTB tokens
    const btbBalance = await btbToken.balanceOf(signer.address);
    
    if (btbBalance < estimatedTotalCost) {
      console.log("\nInsufficient BTB tokens for swap.");
      console.log(`You have: ${ethers.formatUnits(btbBalance, 18)} BTB`);
      console.log(`Required: ~${ethers.formatUnits(estimatedTotalCost, 18)} BTB`);
      return;
    }
    
    // Check if allowance is set
    const allowance = await btbToken.allowance(signer.address, btbSwapLogicAddress);
    
    if (allowance < estimatedTotalCost) {
      console.log("\nApproving BTB tokens for BTBSwapLogic...");
      // Approve a large amount to avoid future approvals
      const approveTx = await btbToken.approve(btbSwapLogicAddress, ethers.parseEther("10000"));
      await approveTx.wait();
      console.log(`Approval transaction hash: ${approveTx.hash}`);
    }
    
    console.log("\nSwapping BTB for Bear NFT...");
    // First try direct swap through BTBSwapLogic
    try {
      const swapTx = await btbSwapContract.swapBTBForNFT(signer.address, nftsToSwap);
      const receipt = await swapTx.wait();
      console.log(`Swap transaction successful! Transaction hash: ${swapTx.hash}`);
      
      // Try to get the NFT IDs from the event logs
      const swapEvent = receipt.logs.find(log => 
        log.topics[0] === ethers.id("SwapBTBForNFTEvent(address,uint256,uint256[])")
      );
      
      if (swapEvent) {
        console.log(`Successfully swapped BTB for Bear NFT!`);
      } else {
        console.log(`Swap succeeded but couldn't parse event logs.`);
      }
    } catch (error) {
      // If direct call fails, try through ecosystem contract
      console.log(`Direct swap failed, trying through ecosystem: ${error.message}`);
      try {
        const ecoSwapTx = await gameContract.swapBTBForNFT(totalSwapRate);
        await ecoSwapTx.wait();
        console.log(`Swap transaction hash (via ecosystem): ${ecoSwapTx.hash}`);
        console.log(`Successfully swapped BTB for Bear NFT via ecosystem!`);
      } catch (ecosystemError) {
        throw new Error(`Failed both direct and ecosystem swap: ${ecosystemError.message}`);
      }
    }
    
    // Check updated Bear NFT balance
    const bearNFTContract = await ethers.getContractAt("BearNFT", BEAR_NFT_ADDRESS);
    const newBearBalance = await bearNFTContract.balanceOf(signer.address);
    console.log(`\nYou now have ${newBearBalance} Bear NFTs`);
    
    // List the Bear NFT IDs
    if (newBearBalance > 0) {
      console.log("Your Bear NFT IDs:");
      for (let i = 0; i < 100; i++) {
        try {
          const owner = await bearNFTContract.ownerOf(i);
          if (owner.toLowerCase() === signer.address.toLowerCase()) {
            console.log(`- Bear #${i}`);
          }
        } catch (e) {
          // Skip this ID if ownerOf fails
        }
      }
    }
    
  } catch (error) {
    console.error("Error swapping BTB for Bear NFT:", error.message);
  }
}

// Function 8: Swap Bear NFT for BTB
async function swapNFTForBTB(gameContract, bearNFT, signer) {
  try {
    // Get BTBSwapLogic address from the ecosystem contract
    const btbSwapLogicAddress = await gameContract.btbSwapContract();
    const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapLogicAddress);
    
    // First check if user has any Bear NFTs
    const bearNFTBalance = await bearNFT.balanceOf(signer.address);
    
    if (bearNFTBalance == 0) {
      console.log("\nYou don't have any Bear NFTs to swap.");
      return;
    }
    
    // Get the swap rate to estimate return
    const swapRate = await btbSwapContract.getSwapRate();
    console.log(`\nCurrent swap rate: ${ethers.formatUnits(swapRate, 18)} BTB per Bear NFT`);
    
    // Get the first Bear NFT ID the user owns
    let bearId = null;
    console.log("Searching for Bear NFTs you own...");
    for (let i = 0; i < 100; i++) {
      try {
        const owner = await bearNFT.ownerOf(i);
        if (owner.toLowerCase() === signer.address.toLowerCase()) {
          bearId = i;
          console.log(`Found Bear NFT #${i} owned by you.`);
          break;
        }
      } catch (e) {
        // Skip this ID if ownerOf fails
      }
    }
    
    if (bearId === null) {
      console.log("\nCouldn't find a Bear NFT ID to swap.");
      return;
    }
    
    // Check if allowance is set
    const isApprovedForAll = await bearNFT.isApprovedForAll(signer.address, btbSwapLogicAddress);
    const isApprovedForToken = await bearNFT.getApproved(bearId) === btbSwapLogicAddress;
    
    if (!isApprovedForAll && !isApprovedForToken) {
      console.log("\nApproving Bear NFT for BTBSwapLogic...");
      // Approve for all to handle multiple swaps
      const approveTx = await bearNFT.setApprovalForAll(btbSwapLogicAddress, true);
      await approveTx.wait();
      console.log(`Approval transaction hash: ${approveTx.hash}`);
    }
    
    console.log(`\nSwapping Bear NFT #${bearId} for BTB tokens...`);
    let swapTx, receipt;
    
    // Try direct swap through BTBSwapLogic first
    try {
      swapTx = await btbSwapContract.swapNFTForBTB(signer.address, [bearId]);
      receipt = await swapTx.wait();
      console.log(`Swap transaction successful! Transaction hash: ${swapTx.hash}`);
      
      // Try to get the amount from the event logs
      const swapEvent = receipt.logs.find(log => 
        log.topics[0] === ethers.id("SwapNFTForBTBEvent(address,uint256[],uint256)")
      );
      
      if (swapEvent) {
        console.log(`Successfully swapped Bear NFT for BTB tokens!`);
      } else {
        console.log(`Swap succeeded but couldn't parse event logs.`);
      }
    } catch (error) {
      // If direct call fails, try through ecosystem contract
      console.log(`Direct swap failed, trying through ecosystem: ${error.message}`);
      try {
        swapTx = await gameContract.swapNFTForBTB([bearId]);
        receipt = await swapTx.wait();
        console.log(`Swap transaction hash (via ecosystem): ${swapTx.hash}`);
        console.log(`Successfully swapped Bear NFT for BTB tokens via ecosystem!`);
      } catch (ecosystemError) {
        throw new Error(`Failed both direct and ecosystem swap: ${ecosystemError.message}`);
      }
    }
    
    // Get BTB token instance
    const btbTokenContract = await ethers.getContractAt("BTBFinance", BTB_TOKEN_ADDRESS);
    
    // Check updated BTB balance
    const newBTBBalance = await btbTokenContract.balanceOf(signer.address);
    console.log(`\nYou now have ${ethers.formatUnits(newBTBBalance, 18)} BTB tokens`);
    
  } catch (error) {
    console.error("Error swapping Bear NFT for BTB:", error.message);
  }
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
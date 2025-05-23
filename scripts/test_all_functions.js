const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== TESTING ALL CONTRACT FUNCTIONS ON BASE SEPOLIA ===\n");
    
    // Load deployment info
    const deploymentPath = './scripts/base_sepolia_deployment.json';
    if (!fs.existsSync(deploymentPath)) {
        throw new Error("Deployment file not found. Please run deployment first.");
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    console.log("Loaded deployment info from Base Sepolia:");
    console.log("Contracts:", deployment.contracts);
    
    const [deployer] = await ethers.getSigners();
    console.log("\nTesting with account:", deployer.address);
    
    // Get contract instances
    const mimoToken = await ethers.getContractAt("MiMoGaMe", deployment.contracts.MiMoGaMe);
    const btbToken = await ethers.getContractAt("BTBFinance", deployment.contracts.BTBToken);
    const bearNFT = await ethers.getContractAt("BearNFT", deployment.contracts.BearNFT);
    const ecosystem = await ethers.getContractAt("BearHunterEcosystem", deployment.contracts.BearHunterEcosystem);
    
    console.log("\n=== INITIAL STATE CHECKS ===");
    
    // Check initial balances
    const mimoBalance = await mimoToken.balanceOf(deployer.address);
    const btbBalance = await btbToken.balanceOf(deployer.address);
    const bearBalance = await bearNFT.balanceOf(deployer.address);
    
    console.log("Initial MiMo balance:", ethers.formatEther(mimoBalance));
    console.log("Initial BTB balance:", ethers.formatEther(btbBalance));
    console.log("Initial Bear NFT balance:", bearBalance.toString());
    
    // Test 1: Deposit Bear NFTs to get Hunters and MiMo tokens
    console.log("\n=== TEST 1: DEPOSIT BEAR NFTS ===");
    
    // Get a Bear NFT ID to deposit
    const bearTokenId = 1; // We minted NFTs starting from 1
    console.log("Depositing Bear NFT #", bearTokenId);
    
    // Approve ecosystem to take the Bear NFT
    console.log("Approving ecosystem for Bear NFT...");
    await bearNFT.approve(ecosystem.target, bearTokenId);
    
    // Deposit the Bear NFT
    console.log("Depositing Bear NFT...");
    const depositTx = await ecosystem.depositBear(bearTokenId);
    const depositReceipt = await depositTx.wait();
    
    // Check new balances
    const newMimoBalance = await mimoToken.balanceOf(deployer.address);
    const hunterBalance = await ecosystem.balanceOf(deployer.address);
    
    console.log("New MiMo balance:", ethers.formatEther(newMimoBalance));
    console.log("Hunter NFT balance:", hunterBalance.toString());
    
    if (hunterBalance > 0) {
        const hunterId = await ecosystem.tokenOfOwnerByIndex(deployer.address, 0);
        console.log("Created Hunter NFT ID:", hunterId.toString());
        
        // Test 2: Get Hunter Stats
        console.log("\n=== TEST 2: HUNTER STATS ===");
        const stats = await ecosystem.getHunterStats(hunterId);
        console.log("Hunter Stats:");
        console.log("- Creation Time:", new Date(Number(stats[0]) * 1000).toISOString());
        console.log("- Power:", stats[3].toString());
        console.log("- In Hibernation:", stats[5]);
        console.log("- Days Remaining:", stats[8].toString());
        
        // Test 3: Check if hunter can hunt/feed
        console.log("\n=== TEST 3: HUNTER CAPABILITIES ===");
        const canHunt = await ecosystem.canHunt(hunterId);
        const canFeed = await ecosystem.canFeed(hunterId);
        console.log("Can hunt:", canHunt[0], "-", canHunt[1]);
        console.log("Can feed:", canFeed[0], "-", canFeed[1]);
        
        // Test 4: Feed Hunter
        console.log("\n=== TEST 4: FEED HUNTER ===");
        try {
            console.log("Feeding hunter...");
            const feedTx = await ecosystem.feedHunter(hunterId);
            await feedTx.wait();
            console.log("Hunter fed successfully!");
            
            // Check stats after feeding
            const newStats = await ecosystem.getHunterStats(hunterId);
            console.log("Power after feeding:", newStats[3].toString());
        } catch (error) {
            console.log("Feeding failed (expected if already fed):", error.message);
        }
        
        // Test 5: Hunt MiMo tokens
        console.log("\n=== TEST 5: HUNT MIMO TOKENS ===");
        try {
            console.log("Hunting MiMo tokens from deployer address...");
            const huntTx = await ecosystem.hunt(hunterId, deployer.address);
            await huntTx.wait();
            console.log("Hunt successful!");
            
            // Check balances after hunt
            const balanceAfterHunt = await mimoToken.balanceOf(deployer.address);
            console.log("MiMo balance after hunt:", ethers.formatEther(balanceAfterHunt));
        } catch (error) {
            console.log("Hunt failed:", error.message);
        }
        
        // Test 6: Generate and display Token URI
        console.log("\n=== TEST 6: TOKEN URI ===");
        try {
            const tokenURI = await ecosystem.tokenURI(hunterId);
            console.log("Hunter NFT Token URI generated successfully");
            console.log("URI length:", tokenURI.length);
            // Don't print full URI as it's very long, just confirm it works
        } catch (error) {
            console.log("Token URI generation failed:", error.message);
        }
    }
    
    // Test 7: BTB Swap Functions
    console.log("\n=== TEST 7: BTB SWAP FUNCTIONS ===");
    try {
        const swapRate = await ecosystem.getSwapRate();
        console.log("Current BTB swap rate:", swapRate.toString());
        
        // Try to approve and swap some BTB for NFTs (small amount)
        const swapAmount = ethers.parseEther("1000"); // 1000 BTB tokens
        console.log("Approving BTB tokens for swap...");
        
        // Get BTBSwap contract address
        const btbSwapAddress = await ecosystem.btbSwapContract();
        console.log("BTBSwap contract address:", btbSwapAddress);
        
        // Approve BTB tokens to the swap contract
        await btbToken.approve(btbSwapAddress, swapAmount);
        
        console.log("Attempting to swap 1000 BTB for NFTs...");
        const swapTx = await ecosystem.swapBTBForNFT(swapAmount);
        await swapTx.wait();
        console.log("BTB swap successful!");
        
    } catch (error) {
        console.log("BTB swap failed:", error.message);
    }
    
    // Test 8: Redemption (if we have enough MiMo tokens)
    console.log("\n=== TEST 8: BEAR NFT REDEMPTION ===");
    try {
        const currentMimo = await mimoToken.balanceOf(deployer.address);
        const redemptionAmount = ethers.parseEther("1000000"); // 1M MiMo + fee
        const feeAmount = ethers.parseEther("100000"); // 10% fee
        const totalNeeded = redemptionAmount + feeAmount;
        
        console.log("Current MiMo balance:", ethers.formatEther(currentMimo));
        console.log("Needed for redemption:", ethers.formatEther(totalNeeded));
        
        if (currentMimo >= totalNeeded) {
            console.log("Attempting to redeem Bear NFT...");
            const redeemTx = await ecosystem.redeemBear();
            await redeemTx.wait();
            console.log("Bear NFT redemption successful!");
            
            const finalBearBalance = await bearNFT.balanceOf(deployer.address);
            console.log("Final Bear NFT balance:", finalBearBalance.toString());
        } else {
            console.log("Not enough MiMo tokens for redemption");
        }
    } catch (error) {
        console.log("Redemption failed:", error.message);
    }
    
    // Test 9: Admin Functions
    console.log("\n=== TEST 9: ADMIN FUNCTIONS ===");
    try {
        // Test pause/unpause
        console.log("Testing pause functionality...");
        await ecosystem.pause();
        console.log("Contract paused successfully");
        
        await ecosystem.unpause();
        console.log("Contract unpaused successfully");
        
        // Test setting protected addresses
        console.log("Testing protected address functionality...");
        await ecosystem.setProtectedAddress(deployer.address, true);
        console.log("Address protection set successfully");
        
    } catch (error) {
        console.log("Admin function failed:", error.message);
    }
    
    // Final state
    console.log("\n=== FINAL STATE ===");
    const finalMimo = await mimoToken.balanceOf(deployer.address);
    const finalBear = await bearNFT.balanceOf(deployer.address);
    const finalHunter = await ecosystem.balanceOf(deployer.address);
    
    console.log("Final MiMo balance:", ethers.formatEther(finalMimo));
    console.log("Final Bear NFT balance:", finalBear.toString());
    console.log("Final Hunter NFT balance:", finalHunter.toString());
    
    console.log("\n=== ALL TESTS COMPLETED ===");
    console.log("Check the transaction hashes on Base Sepolia explorer:");
    console.log("https://sepolia.basescan.org/");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Testing failed:", error);
        process.exit(1);
    });
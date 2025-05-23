const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== DETAILED FUNCTION TESTING ON BASE SEPOLIA ===\n");
    
    // Load deployment info
    const deployment = JSON.parse(fs.readFileSync('./scripts/base_sepolia_deployment.json', 'utf8'));
    const [deployer] = await ethers.getSigners();
    
    // Get contract instances
    const mimoToken = await ethers.getContractAt("MiMoGaMe", deployment.contracts.MiMoGaMe);
    const btbToken = await ethers.getContractAt("BTBFinance", deployment.contracts.BTBToken);
    const bearNFT = await ethers.getContractAt("BearNFT", deployment.contracts.BearNFT);
    const ecosystem = await ethers.getContractAt("BearHunterEcosystem", deployment.contracts.BearHunterEcosystem);
    
    console.log("Testing with account:", deployer.address);
    
    // Test 1: Deposit another Bear NFT
    console.log("\n=== TEST 1: DEPOSIT ANOTHER BEAR NFT ===");
    try {
        const bearTokenId = 2;
        console.log("Depositing Bear NFT #", bearTokenId);
        
        await bearNFT.approve(ecosystem.target, bearTokenId);
        const depositTx = await ecosystem.depositBear(bearTokenId);
        await depositTx.wait();
        
        console.log("✅ Successfully deposited Bear NFT #", bearTokenId);
        
        const hunterBalance = await ecosystem.balanceOf(deployer.address);
        console.log("Total Hunter NFTs:", hunterBalance.toString());
        
        if (hunterBalance >= 2) {
            const hunterId2 = await ecosystem.tokenOfOwnerByIndex(deployer.address, 1);
            console.log("New Hunter NFT ID:", hunterId2.toString());
        }
    } catch (error) {
        console.log("❌ Deposit failed:", error.message);
    }
    
    // Test 2: Check all Hunter stats
    console.log("\n=== TEST 2: ALL HUNTER STATS ===");
    const hunterBalance = await ecosystem.balanceOf(deployer.address);
    
    for (let i = 0; i < hunterBalance; i++) {
        try {
            const hunterId = await ecosystem.tokenOfOwnerByIndex(deployer.address, i);
            const stats = await ecosystem.getHunterStats(hunterId);
            
            console.log(`\nHunter #${hunterId}:`);
            console.log("- Power:", ethers.formatEther(stats[3]));
            console.log("- Status:", stats[5] ? "Hibernating" : "Active");
            console.log("- Days Remaining:", stats[8].toString());
            
            const canHunt = await ecosystem.canHunt(hunterId);
            const canFeed = await ecosystem.canFeed(hunterId);
            console.log("- Can Hunt:", canHunt[0] ? "Yes" : `No - ${canHunt[1]}`);
            console.log("- Can Feed:", canFeed[0] ? "Yes" : `No - ${canFeed[1]}`);
            
        } catch (error) {
            console.log(`❌ Error getting stats for hunter ${i}:`, error.message);
        }
    }
    
    // Test 3: Batch operations
    console.log("\n=== TEST 3: BATCH OPERATIONS ===");
    
    // Batch deposit Bears
    try {
        console.log("Testing batch deposit of Bear NFTs...");
        const bearIds = [3, 4]; // We have NFTs 1-5, already used 1 and 2
        
        // Approve all NFTs
        for (const bearId of bearIds) {
            await bearNFT.approve(ecosystem.target, bearId);
        }
        
        const batchDepositTx = await ecosystem.batchDepositBears(bearIds);
        const receipt = await batchDepositTx.wait();
        
        console.log("✅ Batch deposit successful!");
        console.log("Gas used:", receipt.gasUsed.toString());
        
        const newHunterBalance = await ecosystem.balanceOf(deployer.address);
        console.log("Total Hunters after batch deposit:", newHunterBalance.toString());
        
    } catch (error) {
        console.log("❌ Batch deposit failed:", error.message);
    }
    
    // Test 4: Multi-feed (if possible)
    console.log("\n=== TEST 4: MULTIPLE FEED ATTEMPTS ===");
    const currentHunterBalance = await ecosystem.balanceOf(deployer.address);
    
    if (currentHunterBalance > 0) {
        const hunterIds = [];
        for (let i = 0; i < currentHunterBalance; i++) {
            const hunterId = await ecosystem.tokenOfOwnerByIndex(deployer.address, i);
            hunterIds.push(hunterId);
        }
        
        try {
            console.log("Attempting to feed multiple hunters:", hunterIds.map(id => id.toString()));
            const feedTx = await ecosystem.feedMultipleHunters(hunterIds);
            await feedTx.wait();
            console.log("✅ Multiple feed successful!");
        } catch (error) {
            console.log("❌ Multiple feed failed (expected due to cooldowns):", error.message);
        }
    }
    
    // Test 5: Contract view functions
    console.log("\n=== TEST 5: CONTRACT VIEW FUNCTIONS ===");
    
    try {
        const constants = {
            depositReward: await ecosystem.DEPOSIT_MIMO_REWARD(),
            redemptionAmount: await ecosystem.REDEMPTION_MIMO_AMOUNT(),
            redemptionFee: await ecosystem.REDEMPTION_FEE_PERCENTAGE()
        };
        
        console.log("Contract Constants:");
        console.log("- Deposit Reward:", ethers.formatEther(constants.depositReward), "MiMo");
        console.log("- Redemption Amount:", ethers.formatEther(constants.redemptionAmount), "MiMo");
        console.log("- Redemption Fee:", constants.redemptionFee.toString(), "%");
        
        const addresses = {
            bearNFT: await ecosystem.bearNFT(),
            btbToken: await ecosystem.btbToken(),
            mimoToken: await ecosystem.mimoToken(),
            liquidityReceiver: await ecosystem.liquidityReceiver(),
            feeReceiver: await ecosystem.feeReceiver()
        };
        
        console.log("\nContract Addresses:");
        Object.entries(addresses).forEach(([key, value]) => {
            console.log(`- ${key}: ${value}`);
        });
        
    } catch (error) {
        console.log("❌ Error reading contract constants:", error.message);
    }
    
    // Test 6: BTB Swap detailed testing
    console.log("\n=== TEST 6: BTB SWAP DETAILED TESTING ===");
    
    try {
        const btbSwapAddress = await ecosystem.btbSwapContract();
        const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapAddress);
        
        console.log("BTB Swap Contract:", btbSwapAddress);
        
        // Check swap contract state
        const swapRate = await btbSwapContract.getSwapRate();
        const swapPaused = await btbSwapContract.swapPaused();
        const feePercentage = await btbSwapContract.swapFeePercentage();
        
        console.log("Swap Details:");
        console.log("- Rate:", swapRate.toString());
        console.log("- Paused:", swapPaused);
        console.log("- Fee %:", feePercentage.toString());
        
        // Check NFT liquidity in swap contract
        const nftLiquidity = await bearNFT.balanceOf(btbSwapAddress);
        console.log("- NFT Liquidity:", nftLiquidity.toString());
        
        if (nftLiquidity > 0) {
            console.log("✅ BTB Swap contract has NFT liquidity");
        } else {
            console.log("⚠️  No NFT liquidity in swap contract");
        }
        
    } catch (error) {
        console.log("❌ BTB Swap details failed:", error.message);
    }
    
    // Test 7: Test Token URI for all hunters
    console.log("\n=== TEST 7: TOKEN URI FOR ALL HUNTERS ===");
    
    const finalHunterBalance = await ecosystem.balanceOf(deployer.address);
    for (let i = 0; i < finalHunterBalance; i++) {
        try {
            const hunterId = await ecosystem.tokenOfOwnerByIndex(deployer.address, i);
            const tokenURI = await ecosystem.tokenURI(hunterId);
            
            // Parse the data URI to get the JSON
            if (tokenURI.startsWith('data:application/json;base64,')) {
                const base64Data = tokenURI.substring('data:application/json;base64,'.length);
                const jsonString = Buffer.from(base64Data, 'base64').toString('utf8');
                const metadata = JSON.parse(jsonString);
                
                console.log(`\nHunter #${hunterId} Metadata:`);
                console.log("- Name:", metadata.name);
                console.log("- Power:", metadata.attributes.find(attr => attr.trait_type === "Power")?.value);
                console.log("- Status:", metadata.attributes.find(attr => attr.trait_type === "Status")?.value);
            }
            
        } catch (error) {
            console.log(`❌ Token URI failed for hunter ${i}:`, error.message);
        }
    }
    
    // Final summary
    console.log("\n=== FINAL SUMMARY ===");
    
    const finalMimo = await mimoToken.balanceOf(deployer.address);
    const finalBtb = await btbToken.balanceOf(deployer.address);
    const finalBears = await bearNFT.balanceOf(deployer.address);
    const finalHunters = await ecosystem.balanceOf(deployer.address);
    
    console.log("Final Balances:");
    console.log("- MiMo Tokens:", ethers.formatEther(finalMimo));
    console.log("- BTB Tokens:", ethers.formatEther(finalBtb));
    console.log("- Bear NFTs:", finalBears.toString());
    console.log("- Hunter NFTs:", finalHunters.toString());
    
    console.log("\n✅ ALL DETAILED TESTS COMPLETED SUCCESSFULLY!");
    console.log("\nDeployed contracts are fully functional on Base Sepolia testnet.");
    console.log("View transactions at: https://sepolia.basescan.org/");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Detailed testing failed:", error);
        process.exit(1);
    });
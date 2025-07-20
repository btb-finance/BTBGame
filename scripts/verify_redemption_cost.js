const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Verifying redemption cost calculation...");
    
    // Contract addresses
    const ECOSYSTEM_ADDRESS = "0xD6475A40Ded2d49CdC91ABDf4E3f72601fe77313";
    const MIMO_ADDRESS = "0xB06D289dcA4903C5E803A792713183218EC686E5";
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Testing with account:", deployer.address);
    
    // Get contract instances
    const ecosystem = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
    const mimoToken = await ethers.getContractAt("MiMoGaMe", MIMO_ADDRESS);
    
    console.log("\n=== 📊 Current balances ===");
    const mimoBalance = await mimoToken.balanceOf(deployer.address);
    const hunterBalance = await ecosystem.balanceOf(deployer.address);
    console.log("💰 MiMo balance:", ethers.formatEther(mimoBalance));
    console.log("🎯 Hunter NFT count:", hunterBalance.toString());
    
    if (hunterBalance > 0) {
        // Get a Hunter NFT ID
        const hunterId = await ecosystem.tokenOfOwnerByIndex(deployer.address, 0);
        console.log("🎯 Using Hunter ID:", hunterId.toString());
        
        // Approve MiMo tokens for redemption
        const requiredMimo = ethers.parseEther("2000000"); // Should be enough for 1 redemption
        console.log("🔓 Approving MiMo tokens for redemption...");
        const approveMimoTx = await mimoToken.approve(ECOSYSTEM_ADDRESS, requiredMimo);
        await approveMimoTx.wait();
        console.log("✅ MiMo tokens approved");
        
        console.log("\n=== 🔄 Testing single redemption to verify cost ===");
        
        // Pre-redemption state
        const preRedemptionMimo = await mimoToken.balanceOf(deployer.address);
        const preRedemptionHunters = await ecosystem.balanceOf(deployer.address);
        console.log("📊 Pre-redemption - MiMo:", ethers.formatEther(preRedemptionMimo));
        console.log("📊 Pre-redemption - Hunter NFTs:", preRedemptionHunters.toString());
        
        try {
            // Test redemption
            const redeemTx = await ecosystem.redeemBears(1, [hunterId]);
            console.log("⏳ Redemption transaction sent...");
            const redeemReceipt = await redeemTx.wait();
            console.log("✅ Redemption transaction confirmed!");
            console.log("📄 Transaction hash:", redeemReceipt.hash);
            
            // Check events for exact amount
            console.log("\n📋 Transaction events:");
            const events = redeemReceipt.logs;
            for (let i = 0; i < events.length; i++) {
                try {
                    const decoded = ecosystem.interface.parseLog(events[i]);
                    if (decoded.name === "BearRedeemed") {
                        console.log(`   🐻 BEAR ${decoded.args.bearId} redeemed for ${ethers.formatEther(decoded.args.amount)} MiMo`);
                    } else if (decoded.name === "HunterBurnedForRedemption") {
                        console.log(`   🔥 Hunter ${decoded.args.hunterId} burned for BEAR ${decoded.args.bearId}`);
                    }
                } catch (e) {
                    // Skip events we can't decode
                }
            }
            
            // Post-redemption state
            const postRedemptionMimo = await mimoToken.balanceOf(deployer.address);
            const postRedemptionHunters = await ecosystem.balanceOf(deployer.address);
            console.log("\n📊 Post-redemption - MiMo:", ethers.formatEther(postRedemptionMimo));
            console.log("📊 Post-redemption - Hunter NFTs:", postRedemptionHunters.toString());
            
            // Calculate exact change
            const mimoChange = postRedemptionMimo - preRedemptionMimo;
            const hunterChange = postRedemptionHunters - preRedemptionHunters;
            
            console.log("\n=== 📈 Exact Changes ===");
            console.log("💰 MiMo change:", ethers.formatEther(mimoChange));
            console.log("🎯 Hunter NFT change:", hunterChange.toString());
            
            // Check what the cost per redemption is
            const costPerRedemption = -mimoChange;
            console.log("💰 Cost per redemption:", ethers.formatEther(costPerRedemption));
            
            if (costPerRedemption === ethers.parseEther("1100000")) {
                console.log("✅ CORRECT: Redemption costs 1.1M MiMo tokens");
                console.log("   Previous test result makes sense: 3 × 1M = 3M (not 3.3M)");
                console.log("   This suggests the game is using 1M per redemption, not 1.1M");
            } else if (costPerRedemption === ethers.parseEther("1000000")) {
                console.log("📝 NOTE: Redemption costs 1M MiMo tokens (not 1.1M)");
                console.log("   This explains the previous test: 3 × 1M = 3M");
            } else {
                console.log("❓ Unexpected redemption cost:", ethers.formatEther(costPerRedemption));
            }
            
            // Verify Hunter NFT was destroyed
            try {
                await ecosystem.ownerOf(hunterId);
                console.log("❌ Hunter", hunterId.toString(), "still exists (should be burned)");
            } catch (error) {
                if (error.message.includes("ERC721: invalid token ID")) {
                    console.log("✅ Hunter", hunterId.toString(), "successfully destroyed");
                }
            }
            
        } catch (error) {
            console.error("❌ Single redemption failed:", error.message);
        }
    } else {
        console.log("❌ No Hunter NFTs available for testing");
    }
    
    console.log("\n🎉 Redemption cost verification completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
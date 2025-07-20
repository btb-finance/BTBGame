const { ethers } = require("hardhat");

async function main() {
    console.log("🏭 Continuing bulk test: Approve and deposit NFTs, then test redemption...");
    
    // Contract addresses
    const BEAR_NFT_ADDRESS = "0x21150E998598A9c36A2db73F6BE9193144550D72";
    const ECOSYSTEM_ADDRESS = "0xD6475A40Ded2d49CdC91ABDf4E3f72601fe77313";
    const MIMO_ADDRESS = "0xB06D289dcA4903C5E803A792713183218EC686E5";
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer address:", deployer.address);
    
    // Get contract instances
    const bearNFT = await ethers.getContractAt("BearNFT", BEAR_NFT_ADDRESS);
    const ecosystem = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
    const mimoToken = await ethers.getContractAt("MiMoGaMe", MIMO_ADDRESS);
    
    console.log("\n=== 📊 Current state ===");
    const totalSupply = await bearNFT.totalSupply();
    const bearBalance = await bearNFT.balanceOf(deployer.address);
    console.log("📊 Total BEAR NFT supply:", totalSupply.toString());
    console.log("📊 Deployer BEAR NFT balance:", bearBalance.toString());
    
    // Get all NFTs owned by deployer
    console.log("🔍 Getting owned BEAR NFT IDs...");
    const ownedBearIds = [];
    for (let i = 0; i < Math.min(Number(bearBalance), 100); i++) {
        const tokenId = await bearNFT.tokenOfOwnerByIndex(deployer.address, i);
        ownedBearIds.push(tokenId);
    }
    console.log("🎯 First 10 owned BEAR IDs:", ownedBearIds.slice(0, 10).map(id => id.toString()));
    console.log("📊 Total owned BEAR NFTs to deposit:", ownedBearIds.length);
    
    console.log("\n=== 🔓 Step 1: Approving BEAR NFTs ===");
    const isApproved = await bearNFT.isApprovedForAll(deployer.address, ECOSYSTEM_ADDRESS);
    if (!isApproved) {
        console.log("⏳ Approving all BEAR NFTs...");
        const approveTx = await bearNFT.setApprovalForAll(ECOSYSTEM_ADDRESS, true);
        await approveTx.wait();
        console.log("✅ All BEAR NFTs approved for ecosystem");
    } else {
        console.log("✅ BEAR NFTs already approved");
    }
    
    console.log("\n=== 💰 Step 2: Depositing BEAR NFTs in batches ===");
    
    // Deposit in smaller batches to avoid gas issues
    const batchSize = 20;
    const batches = [];
    for (let i = 0; i < ownedBearIds.length; i += batchSize) {
        batches.push(ownedBearIds.slice(i, i + batchSize));
    }
    
    console.log("📦 Depositing", ownedBearIds.length, "NFTs in", batches.length, "batches of", batchSize);
    
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`⏳ Depositing batch ${i + 1}/${batches.length} (${batch.length} NFTs)...`);
        
        try {
            const depositTx = await ecosystem.depositBears(batch);
            await depositTx.wait();
            console.log(`✅ Batch ${i + 1} deposited successfully`);
        } catch (error) {
            console.error(`❌ Batch ${i + 1} failed:`, error.message);
            break;
        }
    }
    
    console.log("\n=== 📊 Step 3: Checking balances after deposit ===");
    
    // Check MiMo balance
    const mimoBalance = await mimoToken.balanceOf(deployer.address);
    console.log("💰 Total MiMo balance:", ethers.formatEther(mimoBalance));
    
    // Check Hunter NFT balance
    const hunterBalance = await ecosystem.balanceOf(deployer.address);
    console.log("🎯 Total Hunter NFT count:", hunterBalance.toString());
    
    if (hunterBalance >= 15) {
        console.log("\n=== 🔄 Step 4: Testing multiple NFT redemption ===");
        
        // Approve MiMo tokens for redemption
        const requiredMimo = ethers.parseEther("3300000"); // 3 NFTs × 1.1M each
        console.log("🔓 Approving MiMo tokens for redemption...");
        const approveMimoTx = await mimoToken.approve(ECOSYSTEM_ADDRESS, requiredMimo);
        await approveMimoTx.wait();
        console.log("✅ MiMo tokens approved");
        
        // Get owned Hunter NFT IDs
        const ownedHunters = [];
        for (let i = 0; i < Math.min(Number(hunterBalance), 30); i++) {
            const hunterId = await ecosystem.tokenOfOwnerByIndex(deployer.address, i);
            ownedHunters.push(hunterId);
        }
        console.log("🎯 Available Hunter IDs:", ownedHunters.slice(0, 20).map(id => id.toString()));
        
        // Test redemption with specific Hunter IDs: pick 10th, 27th, and 15th from our list
        let targetHunterIds = [];
        if (ownedHunters.length >= 10) targetHunterIds.push(ownedHunters[9]); // 10th
        if (ownedHunters.length >= 27) targetHunterIds.push(ownedHunters[26]); // 27th  
        if (ownedHunters.length >= 15) targetHunterIds.push(ownedHunters[14]); // 15th
        
        // If we don't have enough, just use the first 3
        if (targetHunterIds.length < 3) {
            targetHunterIds = ownedHunters.slice(0, 3);
        }
        
        console.log("🎯 Redeeming with Hunter IDs:", targetHunterIds.map(id => id.toString()));
        
        // Pre-redemption state
        const preRedemptionMimo = await mimoToken.balanceOf(deployer.address);
        const preRedemptionHunters = await ecosystem.balanceOf(deployer.address);
        console.log("📊 Pre-redemption - MiMo:", ethers.formatEther(preRedemptionMimo), "Hunter NFTs:", preRedemptionHunters.toString());
        
        try {
            // Test static call first
            console.log("🔍 Testing static call for multiple redemption...");
            await ecosystem.redeemBears.staticCall(3, targetHunterIds);
            console.log("✅ Static call passed, executing transaction...");
            
            // Execute redemption
            const redeemTx = await ecosystem.redeemBears(3, targetHunterIds);
            console.log("⏳ Redemption transaction sent...");
            const redeemReceipt = await redeemTx.wait();
            console.log("✅ Redemption transaction confirmed!");
            console.log("📄 Transaction hash:", redeemReceipt.hash);
            
            // Post-redemption state
            const postRedemptionMimo = await mimoToken.balanceOf(deployer.address);
            const postRedemptionHunters = await ecosystem.balanceOf(deployer.address);
            console.log("📊 Post-redemption - MiMo:", ethers.formatEther(postRedemptionMimo), "Hunter NFTs:", postRedemptionHunters.toString());
            
            // Calculate changes
            const mimoChange = postRedemptionMimo - preRedemptionMimo;
            const hunterChange = postRedemptionHunters - preRedemptionHunters;
            
            console.log("\n=== 📈 Balance Changes ===");
            console.log("💰 MiMo change:", ethers.formatEther(mimoChange));
            console.log("🎯 Hunter NFT change:", hunterChange.toString());
            
            // Verify the results
            const expectedMimoChange = ethers.parseEther("-3300000"); // -3.3M MiMo
            const expectedHunterChange = -3n; // -3 Hunter NFTs
            
            if (mimoChange === expectedMimoChange && hunterChange === expectedHunterChange) {
                console.log("✅ PERFECT: Multiple redemption worked correctly!");
                console.log("   - Spent exactly 3.3M MiMo tokens ✅");
                console.log("   - Burned exactly 3 Hunter NFTs ✅");
                console.log("   - Hunter NFTs properly destroyed ✅");
            }
            
            // Verify the burned Hunter NFTs no longer exist
            console.log("\n🔍 Verifying burned Hunter NFTs are destroyed...");
            for (const hunterId of targetHunterIds) {
                try {
                    await ecosystem.ownerOf(hunterId);
                    console.log("❌ Hunter", hunterId.toString(), "still exists (should be burned)");
                } catch (error) {
                    if (error.message.includes("ERC721: invalid token ID")) {
                        console.log("✅ Hunter", hunterId.toString(), "successfully destroyed");
                    }
                }
            }
            
        } catch (error) {
            console.error("❌ Multiple redemption failed:", error.message);
        }
    } else {
        console.log("❌ Not enough Hunter NFTs for multiple redemption test");
        console.log("   Need at least 15, have:", hunterBalance.toString());
    }
    
    console.log("\n🎉 Bulk testing completed!");
    console.log("📊 Final state:");
    console.log("   💰 MiMo balance:", ethers.formatEther(await mimoToken.balanceOf(deployer.address)));
    console.log("   🎯 Hunter NFT count:", (await ecosystem.balanceOf(deployer.address)).toString());
    console.log("   🐻 BEAR NFT count:", (await bearNFT.balanceOf(deployer.address)).toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
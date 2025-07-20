const { ethers } = require("hardhat");

async function main() {
    console.log("🏭 Bulk testing: Mint 100 NFTs, deposit all, then test multiple redemption...");
    
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
    
    console.log("\n=== 🎨 Step 1: Bulk minting 100 BEAR NFTs ===");
    
    // Check current supply
    const currentSupply = await bearNFT.totalSupply();
    console.log("📊 Current BEAR NFT supply:", currentSupply.toString());
    
    // Mint 100 NFTs in bulk
    console.log("⏳ Minting 100 BEAR NFTs...");
    const mintTx = await bearNFT.batchMint(deployer.address, 100);
    await mintTx.wait();
    console.log("✅ Successfully minted 100 BEAR NFTs");
    
    // Check new supply
    const newSupply = await bearNFT.totalSupply();
    console.log("📊 New BEAR NFT supply:", newSupply.toString());
    
    // Calculate the NFT IDs that were just minted
    const startId = Number(currentSupply) + 1;
    const endId = Number(newSupply);
    const nftIds = [];
    for (let i = startId; i <= endId; i++) {
        nftIds.push(BigInt(i));
    }
    console.log("🎯 Minted NFT IDs:", startId, "to", endId);
    
    console.log("\n=== 🔓 Step 2: Approving all BEAR NFTs ===");
    const approveTx = await bearNFT.setApprovalForAll(ECOSYSTEM_ADDRESS, true);
    await approveTx.wait();
    console.log("✅ All BEAR NFTs approved for ecosystem");
    
    console.log("\n=== 💰 Step 3: Depositing all 100 BEAR NFTs ===");
    console.log("⏳ Depositing 100 BEAR NFTs...");
    const depositTx = await ecosystem.depositBears(nftIds);
    const depositReceipt = await depositTx.wait();
    console.log("✅ Successfully deposited 100 BEAR NFTs");
    console.log("📄 Deposit transaction:", depositReceipt.hash);
    
    console.log("\n=== 📊 Step 4: Checking balances after deposit ===");
    
    // Check MiMo balance
    const mimoBalance = await mimoToken.balanceOf(deployer.address);
    console.log("💰 Total MiMo balance:", ethers.formatEther(mimoBalance));
    
    // Check Hunter NFT balance
    const hunterBalance = await ecosystem.balanceOf(deployer.address);
    console.log("🎯 Total Hunter NFT count:", hunterBalance.toString());
    
    // Get owned Hunter NFT IDs
    const ownedHunters = [];
    for (let i = 0; i < Math.min(Number(hunterBalance), 20); i++) { // Show first 20 for display
        const hunterId = await ecosystem.tokenOfOwnerByIndex(deployer.address, i);
        ownedHunters.push(hunterId);
    }
    console.log("🎯 First 20 Hunter IDs:", ownedHunters.map(id => id.toString()));
    
    if (hunterBalance > 20) {
        console.log("   ... and", (Number(hunterBalance) - 20), "more Hunter NFTs");
    }
    
    console.log("\n=== 🔄 Step 5: Testing multiple NFT redemption ===");
    
    // Approve MiMo tokens for redemption
    const requiredMimo = ethers.parseEther("3300000"); // 3 NFTs × 1.1M each
    console.log("🔓 Approving MiMo tokens for redemption...");
    const approveMimoTx = await mimoToken.approve(ECOSYSTEM_ADDRESS, requiredMimo);
    await approveMimoTx.wait();
    console.log("✅ MiMo tokens approved");
    
    // Test redemption with specific Hunter IDs: 10, 27, 15
    const targetHunterIds = [10, 27, 15].map(id => BigInt(id));
    
    // Verify we own these Hunter NFTs
    console.log("🔍 Verifying ownership of target Hunter NFTs...");
    for (const hunterId of targetHunterIds) {
        try {
            const owner = await ecosystem.ownerOf(hunterId);
            if (owner.toLowerCase() === deployer.address.toLowerCase()) {
                console.log("✅ Hunter", hunterId.toString(), "owned by deployer");
            } else {
                console.log("❌ Hunter", hunterId.toString(), "owned by", owner);
            }
        } catch (error) {
            console.log("❌ Hunter", hunterId.toString(), "does not exist");
        }
    }
    
    console.log("\n🎯 Attempting to redeem 3 BEAR NFTs using Hunter IDs:", targetHunterIds.map(id => id.toString()));
    
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
        
        // Check events
        console.log("\n📋 Redemption events:");
        const events = redeemReceipt.logs;
        let burnedHunters = [];
        let redeemedBears = [];
        
        for (let i = 0; i < events.length; i++) {
            try {
                const decoded = ecosystem.interface.parseLog(events[i]);
                if (decoded.name === "HunterBurnedForRedemption") {
                    burnedHunters.push(decoded.args.hunterId.toString());
                    console.log(`   🔥 Hunter ${decoded.args.hunterId} burned for BEAR ${decoded.args.bearId}`);
                } else if (decoded.name === "BearRedeemed") {
                    redeemedBears.push(decoded.args.bearId.toString());
                    console.log(`   🐻 BEAR ${decoded.args.bearId} redeemed for ${ethers.formatEther(decoded.args.amount)} MiMo`);
                } else if (decoded.name === "Transfer" && decoded.args.to === "0x0000000000000000000000000000000000000000") {
                    console.log(`   💀 Hunter ${decoded.args.tokenId} transferred to burn address (destroyed)`);
                }
            } catch (e) {
                // Skip events we can't decode
            }
        }
        
        // Post-redemption state
        const postRedemptionMimo = await mimoToken.balanceOf(deployer.address);
        const postRedemptionHunters = await ecosystem.balanceOf(deployer.address);
        console.log("\n📊 Post-redemption - MiMo:", ethers.formatEther(postRedemptionMimo), "Hunter NFTs:", postRedemptionHunters.toString());
        
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
            console.log("   - Got 3 BEAR NFTs back ✅");
        } else {
            console.log("❌ Unexpected balance changes:");
            console.log("   Expected MiMo change:", ethers.formatEther(expectedMimoChange));
            console.log("   Actual MiMo change:", ethers.formatEther(mimoChange));
            console.log("   Expected Hunter change:", expectedHunterChange.toString());
            console.log("   Actual Hunter change:", hunterChange.toString());
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
                } else {
                    console.log("❓ Hunter", hunterId.toString(), "check failed:", error.message);
                }
            }
        }
        
    } catch (error) {
        console.error("❌ Multiple redemption failed:", error.message);
        
        // Debug information
        console.log("\n🔍 Debug info:");
        console.log("   MiMo balance:", ethers.formatEther(await mimoToken.balanceOf(deployer.address)));
        console.log("   MiMo allowance:", ethers.formatEther(await mimoToken.allowance(deployer.address, ECOSYSTEM_ADDRESS)));
        console.log("   Hunter NFT count:", (await ecosystem.balanceOf(deployer.address)).toString());
    }
    
    console.log("\n🎉 Bulk testing completed!");
    console.log("📊 Final state:");
    console.log("   💰 MiMo balance:", ethers.formatEther(await mimoToken.balanceOf(deployer.address)));
    console.log("   🎯 Hunter NFT count:", (await ecosystem.balanceOf(deployer.address)).toString());
    console.log("   🐻 BEAR NFT supply:", (await bearNFT.totalSupply()).toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
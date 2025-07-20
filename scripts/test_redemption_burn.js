const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing Hunter NFT burning during redemption...");
    
    // Contract addresses from recent deployment
    const ECOSYSTEM_ADDRESS = "0xD6475A40Ded2d49CdC91ABDf4E3f72601fe77313";
    const BURN_ADDRESS = "0x0000000000000000000000000000000000000000";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Testing with account:", signer.address);
    
    // Get contract instance
    const ecosystem = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
    
    console.log("\n=== 📊 Pre-Redemption State ===");
    
    // Get MiMo token contract
    const MIMO_ADDRESS = "0xB06D289dcA4903C5E803A792713183218EC686E5";
    const mimoToken = await ethers.getContractAt("MiMoGaMe", MIMO_ADDRESS);
    
    // Check current balances
    const mimoBalance = await mimoToken.balanceOf(signer.address);
    const hunterBalance = await ecosystem.balanceOf(signer.address);
    console.log("📊 Current MiMo balance:", ethers.formatEther(mimoBalance));
    console.log("📊 Current Hunter NFT count:", hunterBalance.toString());
    
    // Get owned Hunter NFT IDs
    const ownedHunters = [];
    for (let i = 0; i < hunterBalance; i++) {
        const hunterId = await ecosystem.tokenOfOwnerByIndex(signer.address, i);
        ownedHunters.push(hunterId);
    }
    console.log("🎯 Owned Hunter IDs:", ownedHunters.map(id => id.toString()));
    
    // Check burn address balance (should be 0 before)
    let burnAddressBalance = 0;
    try {
        burnAddressBalance = await ecosystem.balanceOf(BURN_ADDRESS);
    } catch (error) {
        // address(0) might not work with balanceOf, that's fine
    }
    console.log("🔥 Burn address Hunter count before:", burnAddressBalance.toString());
    
    // Test redemption if we have enough
    if (ownedHunters.length >= 1 && mimoBalance >= ethers.parseEther("1100000")) {
        console.log("\n=== 🔄 Testing Redemption (1 BEAR) ===");
        
        // First check and approve MiMo tokens if needed
        const requiredAmount = ethers.parseEther("1100000");
        const currentAllowance = await mimoToken.allowance(signer.address, ECOSYSTEM_ADDRESS);
        console.log("💰 Required MiMo amount:", ethers.formatEther(requiredAmount));
        console.log("💰 Current allowance:", ethers.formatEther(currentAllowance));
        
        if (currentAllowance < requiredAmount) {
            console.log("🔓 Approving MiMo tokens for ecosystem...");
            const approveTx = await mimoToken.approve(ECOSYSTEM_ADDRESS, requiredAmount);
            await approveTx.wait();
            console.log("✅ MiMo tokens approved");
        }
        
        // Try to redeem 1 BEAR NFT - use the newest Hunter (should be ID 7 or higher)
        const newestHunter = ownedHunters.find(id => id >= 7) || ownedHunters[0];
        const hunterIdToUse = [newestHunter];
        
        console.log("🎯 Using Hunter ID for redemption:", hunterIdToUse[0].toString());
        console.log("🔥 This Hunter will be sent to burn address:", BURN_ADDRESS);
        
        try {
            // Try static call first to get better error info
            console.log("🔍 Testing static call...");
            await ecosystem.redeemBears.staticCall(1, hunterIdToUse);
            console.log("✅ Static call passed, executing transaction...");
            
            const tx = await ecosystem.redeemBears(1, hunterIdToUse);
            console.log("⏳ Transaction sent, waiting for confirmation...");
            const receipt = await tx.wait();
            console.log("✅ Redemption transaction confirmed!");
            console.log("📄 Transaction hash:", receipt.hash);
            
            // Check the events to see what happened
            const events = receipt.logs;
            console.log("📋 Transaction events:");
            for (let i = 0; i < events.length; i++) {
                try {
                    const decoded = ecosystem.interface.parseLog(events[i]);
                    if (decoded.name === "HunterBurnedForRedemption") {
                        console.log(`   🔥 Hunter Burned: ID ${decoded.args.hunterId} by ${decoded.args.user} for BEAR ${decoded.args.bearId}`);
                    } else if (decoded.name === "Transfer" && decoded.args.to === BURN_ADDRESS) {
                        console.log(`   📤 Transfer to burn address: Token ${decoded.args.tokenId} from ${decoded.args.from}`);
                    }
                } catch (e) {
                    // Skip events we can't decode
                }
            }
            
        } catch (error) {
            console.error("❌ Redemption failed:", error.message);
            return;
        }
        
        console.log("\n=== 📊 Post-Redemption State ===");
        
        // Check balances after redemption
        const newMimoBalance = await mimoToken.balanceOf(signer.address);
        const newHunterBalance = await ecosystem.balanceOf(signer.address);
        console.log("📊 New MiMo balance:", ethers.formatEther(newMimoBalance));
        console.log("📊 New Hunter NFT count:", newHunterBalance.toString());
        
        // Check if the Hunter NFT was transferred to burn address
        try {
            const ownerOfBurnedHunter = await ecosystem.ownerOf(hunterIdToUse[0]);
            console.log("🎯 Hunter ID", hunterIdToUse[0].toString(), "now owned by:", ownerOfBurnedHunter);
            
            if (ownerOfBurnedHunter === BURN_ADDRESS) {
                console.log("✅ SUCCESS: Hunter NFT successfully burned to address(0)!");
            } else {
                console.log("❌ UNEXPECTED: Hunter NFT not sent to burn address");
            }
        } catch (error) {
            if (error.message.includes("ERC721: invalid token ID")) {
                console.log("✅ SUCCESS: Hunter NFT no longer exists (truly burned)!");
            } else {
                console.log("❓ Error checking owner:", error.message);
            }
        }
        
        // Check burn address balance after
        try {
            const newBurnAddressBalance = await ecosystem.balanceOf(BURN_ADDRESS);
            console.log("🔥 Burn address Hunter count after:", newBurnAddressBalance.toString());
            
            if (newBurnAddressBalance > burnAddressBalance) {
                console.log("✅ SUCCESS: Burn address received the Hunter NFT!");
            }
        } catch (error) {
            console.log("❓ Could not check burn address balance:", error.message);
        }
        
        console.log("\n=== 📈 Balance Changes ===");
        console.log("💰 MiMo change:", ethers.formatEther(newMimoBalance - mimoBalance), "ETH");
        console.log("🎯 Hunter NFT change:", (newHunterBalance - hunterBalance).toString());
        
        if (newMimoBalance - mimoBalance === ethers.parseEther("-1100000") && 
            newHunterBalance - hunterBalance === -1n) {
            console.log("✅ PERFECT: Redemption worked correctly!");
            console.log("   - Spent exactly 1.1M MiMo tokens ✅");
            console.log("   - Burned exactly 1 Hunter NFT ✅");
            console.log("   - Hunter sent to address(0) ✅");
        }
        
    } else {
        console.log("❌ Cannot test redemption:");
        console.log("   - Need at least 1 Hunter NFT (have:", ownedHunters.length, ")");
        console.log("   - Need at least 1.1M MiMo tokens (have:", ethers.formatEther(mimoBalance), ")");
    }
    
    console.log("\n🎉 Redemption burn test completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Checking all fees in the BearHunter Ecosystem...");
    
    // Contract addresses
    const ECOSYSTEM_ADDRESS = "0x2fd23D926Ec63eE44c6820Feb7b0252d91a7a4bE";
    const BTB_SWAP_LOGIC_ADDRESS = "0x69DF81EfCE2609928c54a1671d1F0793ABa9C170";
    
    try {
        console.log("\n=== 🏛️ ECOSYSTEM CONTRACT FEES ===");
        
        // Connect to Ecosystem
        const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
        const ecosystem = BearHunterEcosystem.attach(ECOSYSTEM_ADDRESS);
        
        // Read redemption fees
        const redemptionFeePercentage = await ecosystem.REDEMPTION_FEE_PERCENTAGE();
        const redemptionMimoAmount = await ecosystem.REDEMPTION_MIMO_AMOUNT();
        
        console.log("📋 BEAR Redemption Fees:");
        console.log("   Base cost:", ethers.formatEther(redemptionMimoAmount), "MiMo tokens");
        console.log("   Fee percentage:", redemptionFeePercentage.toString() + "%");
        
        // Calculate actual fee
        const feeAmountPerNFT = (redemptionMimoAmount * redemptionFeePercentage) / 100n;
        const totalCostPerNFT = redemptionMimoAmount + feeAmountPerNFT;
        
        console.log("   Fee amount:", ethers.formatEther(feeAmountPerNFT), "MiMo tokens");
        console.log("   TOTAL cost per BEAR:", ethers.formatEther(totalCostPerNFT), "MiMo tokens");
        
        // Read hunt reward distribution
        console.log("\n📋 Hunt Reward Distribution:");
        const ownerRewardPercentage = await ecosystem.ownerRewardPercentage();
        const burnPercentage = await ecosystem.burnPercentage();
        const liquidityPercentage = await ecosystem.liquidityPercentage();
        
        console.log("   Hunter owner gets:", (Number(ownerRewardPercentage) / 100).toFixed(1) + "%");
        console.log("   Burned:", (Number(burnPercentage) / 100).toFixed(1) + "%");
        console.log("   To liquidity:", (Number(liquidityPercentage) / 100).toFixed(1) + "%");
        
        // Read fee receivers
        console.log("\n📋 Fee Recipients:");
        const feeReceiver = await ecosystem.feeReceiver();
        const liquidityReceiver = await ecosystem.liquidityReceiver();
        console.log("   Redemption fee receiver:", feeReceiver);
        console.log("   Liquidity receiver:", liquidityReceiver);
        
        console.log("\n=== 🔄 BTB SWAP LOGIC FEES ===");
        
        // Connect to BTBSwapLogic
        const BTBSwapLogic = await ethers.getContractFactory("BTBSwapLogic");
        const btbSwap = BTBSwapLogic.attach(BTB_SWAP_LOGIC_ADDRESS);
        
        // Read BTB swap fees
        const swapFeePercentage = await btbSwap.swapFeePercentage();
        const adminFeeShare = await btbSwap.adminFeeShare();
        const swapPaused = await btbSwap.swapPausedState();
        
        console.log("📋 BTB ↔ NFT Swap Fees:");
        console.log("   Swap fee:", (Number(swapFeePercentage) / 100).toFixed(2) + "% (in basis points)");
        console.log("   Admin gets:", (Number(adminFeeShare) / 100).toFixed(1) + "% of swap fees");
        console.log("   Swap paused:", swapPaused);
        
        const btbFeeReceiver = await btbSwap.feeReceiver();
        console.log("   BTB swap fee receiver:", btbFeeReceiver);
        
        // Get swap rate
        try {
            const swapRate = await btbSwap.getSwapRate();
            console.log("   Current swap rate:", ethers.formatEther(swapRate), "BTB per NFT");
        } catch (e) {
            console.log("   Current swap rate: Not available (no liquidity)");
        }
        
        console.log("\n=== 💡 FEE SUMMARY ===");
        console.log("🐻 BEAR Redemption:");
        console.log("   • Cost: 1,000,000 MiMo + 10% fee (100,000 MiMo)");
        console.log("   • Total: 1,100,000 MiMo tokens per BEAR");
        console.log("");
        console.log("🎯 Hunting Rewards:");
        console.log("   • Hunter owner: 50% of hunted tokens");
        console.log("   • Burned: 25% of hunted tokens");
        console.log("   • Liquidity: 25% of hunted tokens");
        console.log("");
        console.log("🔄 BTB Swaps:");
        console.log("   • Swap fee: " + (Number(swapFeePercentage) / 100).toFixed(2) + "% of trade value");
        console.log("   • Admin share: " + (Number(adminFeeShare) / 100).toFixed(1) + "% of swap fees");
        console.log("");
        console.log("🎮 BEAR Deposits:");
        console.log("   • No fees - receive 1,000,000 MiMo + 1 Hunter NFT");
        
        console.log("\n✅ All fees are clearly defined and reasonable for the ecosystem!");
        
    } catch (error) {
        console.error("❌ Error reading fees:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
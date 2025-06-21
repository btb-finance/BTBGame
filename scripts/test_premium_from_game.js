const { ethers } = require("hardhat");

async function main() {
    console.log("🎮 Testing Premium Logic from Game Contract");
    console.log("=" .repeat(50));

    // Get deployed contract addresses
    const deployedContracts = require('./base_sepolia_deployment.json');
    
    const [owner] = await ethers.getSigners();
    console.log("Owner address:", owner.address);

    // Connect to contracts
    const gameContract = await ethers.getContractAt("BearHunterEcosystem", deployedContracts.BearHunterEcosystem);
    const btbSwapLogic = await ethers.getContractAt("BTBSwapLogic", deployedContracts.BTBSwapLogic);
    
    console.log("\n📊 Current State:");
    
    // Check current premium via BTBSwapLogic
    const currentPremium = await btbSwapLogic.buyPremium();
    console.log("Current buy premium:", ethers.formatEther(currentPremium), "BTB");
    
    // Check current swap rate
    const currentRate = await btbSwapLogic.getSwapRate();
    console.log("Current swap rate (base + premium):", ethers.formatEther(currentRate), "BTB per NFT");
    
    console.log("\n🎮 Setting Premium from Game Contract:");
    
    // Test setting premium to 999 BTB via game contract
    const premiumAmount = ethers.parseEther("999"); // 999 BTB premium
    console.log("Setting premium to:", ethers.formatEther(premiumAmount), "BTB via game contract...");
    
    // Call setBuyPremium on the game contract (which calls btbSwapLogic.setBuyPremium)
    const tx = await gameContract.setBuyPremium(premiumAmount);
    await tx.wait();
    console.log("✅ Premium set successfully via game contract!");
    
    // Verify the change
    const newPremium = await btbSwapLogic.buyPremium();
    console.log("New buy premium:", ethers.formatEther(newPremium), "BTB");
    
    const newRate = await btbSwapLogic.getSwapRate();
    console.log("New swap rate (base + premium):", ethers.formatEther(newRate), "BTB per NFT");
    
    console.log("\n🔗 Contract Ownership Structure:");
    console.log("✅ Game Contract is owner of BTBSwapLogic");
    console.log("✅ Admin can call setBuyPremium() on Game Contract");
    console.log("✅ Game Contract forwards call to BTBSwapLogic");
    console.log("✅ Premium is now applied to all NFT purchases");
    
    console.log("\n💡 Usage Summary:");
    console.log("- Game Contract Address:", deployedContracts.BearHunterEcosystem);
    console.log("- BTBSwapLogic Address:", deployedContracts.BTBSwapLogic);
    console.log("- Call gameContract.setBuyPremium(amount) to set premium");
    console.log("- Premium automatically applies to all buy functions");
    
    // Test resetting premium to 0
    console.log("\n🔄 Testing Premium Reset:");
    const resetTx = await gameContract.setBuyPremium(0);
    await resetTx.wait();
    
    const resetPremium = await btbSwapLogic.buyPremium();
    const resetRate = await btbSwapLogic.getSwapRate();
    console.log("Premium reset to:", ethers.formatEther(resetPremium), "BTB");
    console.log("Swap rate after reset:", ethers.formatEther(resetRate), "BTB per NFT");
    console.log("✅ Premium can be disabled by setting to 0");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 
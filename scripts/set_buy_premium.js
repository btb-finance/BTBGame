const { ethers } = require("hardhat");

async function main() {
    console.log("💎 Setting buy premium to 5000 BTB tokens...");
    
    // Base mainnet contract addresses
    const BTBSWAP_ADDRESS = "0x84dddA499a92754863CAC64dA83D21b892fB2b37";
    const ECOSYSTEM_ADDRESS = "0x25bB56840715242C1E140d4125F0cc283B1Df717";
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Setting premium from account:", deployer.address);
    
    // Get contract instances
    const ecosystem = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
    
    console.log("📍 Contract addresses:");
    console.log("   🔄 BTBSwapLogic:", BTBSWAP_ADDRESS);
    console.log("   🏛️ BearHunterEcosystem:", ECOSYSTEM_ADDRESS);
    
    // Calculate 5000 BTB with 18 decimals
    const buyPremiumAmount = ethers.parseEther("5000"); // 5000 * 10^18
    console.log("💰 Setting buy premium to:", ethers.formatEther(buyPremiumAmount), "BTB");
    console.log("💰 Raw amount (wei):", buyPremiumAmount.toString());
    
    console.log("\n=== 🔍 Checking current state ===");
    
    // Check current ownership
    const ecosystemOwner = await ecosystem.owner();
    console.log("📋 BearHunterEcosystem owner:", ecosystemOwner);
    console.log("📋 Your address:", deployer.address);
    
    if (ecosystemOwner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("❌ Error: You are not the owner of BearHunterEcosystem");
        console.log("   Contract owner:", ecosystemOwner);
        console.log("   Your address:", deployer.address);
        return;
    }
    
    // Check if BTBSwapLogic is properly configured
    const btbSwapAddress = await ecosystem.btbSwapContract();
    console.log("📋 BTBSwap address in ecosystem:", btbSwapAddress);
    
    if (btbSwapAddress.toLowerCase() !== BTBSWAP_ADDRESS.toLowerCase()) {
        console.log("❌ Error: BTBSwapLogic address mismatch");
        console.log("   Expected:", BTBSWAP_ADDRESS);
        console.log("   Configured:", btbSwapAddress);
        return;
    }
    
    console.log("\n=== 💎 Setting buy premium ===");
    
    try {
        // Set the buy premium
        console.log("⏳ Executing setBuyPremium...");
        const setPremiumTx = await ecosystem.setBuyPremium(buyPremiumAmount);
        console.log("📄 Transaction hash:", setPremiumTx.hash);
        
        console.log("⏳ Waiting for confirmation...");
        await setPremiumTx.wait();
        console.log("✅ Transaction confirmed!");
        
        // Verify the setting
        console.log("\n=== 🔍 Verifying buy premium ===");
        
        // Get the BTBSwapLogic contract to check the premium
        const btbSwapLogic = await ethers.getContractAt("BTBSwapLogic", BTBSWAP_ADDRESS);
        const currentPremium = await btbSwapLogic.buyPremium();
        
        console.log("📋 Current buy premium:", ethers.formatEther(currentPremium), "BTB");
        console.log("📋 Expected buy premium:", ethers.formatEther(buyPremiumAmount), "BTB");
        
        if (currentPremium.toString() === buyPremiumAmount.toString()) {
            console.log("✅ SUCCESS: Buy premium successfully set!");
            console.log("   💎 Premium amount: 5000 BTB tokens");
            console.log("   💰 Users must pay 5000 BTB + swap rate for premium NFT purchases");
        } else {
            console.log("❌ ERROR: Buy premium setting failed");
            console.log("   Expected:", ethers.formatEther(buyPremiumAmount), "BTB");
            console.log("   Actual:", ethers.formatEther(currentPremium), "BTB");
        }
        
        console.log("\n=== 📊 Premium Purchase Info ===");
        console.log("💎 Buy Premium: 5000 BTB tokens");
        console.log("🔄 This premium is added to the base swap rate");
        console.log("💰 Total cost for premium purchase = Swap Rate + 5000 BTB");
        console.log("🎯 Premium purchases provide additional BTB tokens to the game ecosystem");
        
        console.log("\n🎉 Buy premium configuration completed successfully!");
        console.log("🔗 View BTBSwapLogic on BaseScan:");
        console.log("   https://basescan.org/address/" + BTBSWAP_ADDRESS);
        console.log("🔗 View BearHunterEcosystem on BaseScan:");
        console.log("   https://basescan.org/address/" + ECOSYSTEM_ADDRESS);
        
    } catch (error) {
        console.error("❌ Error setting buy premium:", error.message);
        
        // Additional debugging info
        console.log("\n🔍 Debug information:");
        console.log("   Deployer address:", deployer.address);
        console.log("   Ecosystem owner:", await ecosystem.owner());
        console.log("   BTBSwap address:", await ecosystem.btbSwapContract());
        console.log("   Premium amount:", buyPremiumAmount.toString());
        
        if (error.message.includes("Ownable: caller is not the owner")) {
            console.log("💡 Make sure you're using the correct account that owns BearHunterEcosystem");
        } else if (error.message.includes("BTBSwapNotConfigured")) {
            console.log("💡 BTBSwapLogic contract may not be properly configured");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 Transferring BTBSwapLogic ownership to BearHunterEcosystem...");
    
    // Base mainnet contract addresses
    const BTBSWAP_ADDRESS = "0x84dddA499a92754863CAC64dA83D21b892fB2b37";
    const ECOSYSTEM_ADDRESS = "0x25bB56840715242C1E140d4125F0cc283B1Df717";
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Transferring from account:", deployer.address);
    
    // Get contract instances
    const btbSwapLogic = await ethers.getContractAt("BTBSwapLogic", BTBSWAP_ADDRESS);
    const ecosystem = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
    
    console.log("📍 Contract addresses:");
    console.log("   🔄 BTBSwapLogic:", BTBSWAP_ADDRESS);
    console.log("   🏛️ BearHunterEcosystem:", ECOSYSTEM_ADDRESS);
    
    // Check current ownership
    console.log("\n=== 🔍 Checking current ownership ===");
    const currentOwner = await btbSwapLogic.owner();
    console.log("📋 Current BTBSwapLogic owner:", currentOwner);
    console.log("📋 Target owner (ecosystem):", ECOSYSTEM_ADDRESS);
    
    if (currentOwner.toLowerCase() === ECOSYSTEM_ADDRESS.toLowerCase()) {
        console.log("✅ BTBSwapLogic is already owned by the ecosystem!");
        return;
    }
    
    if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("❌ Error: You are not the current owner of BTBSwapLogic");
        console.log("   Current owner:", currentOwner);
        console.log("   Your address:", deployer.address);
        return;
    }
    
    console.log("\n=== 🔄 Transferring ownership ===");
    
    try {
        // Transfer ownership
        console.log("⏳ Executing ownership transfer...");
        const transferTx = await btbSwapLogic.transferOwnership(ECOSYSTEM_ADDRESS);
        console.log("📄 Transaction hash:", transferTx.hash);
        
        console.log("⏳ Waiting for confirmation...");
        await transferTx.wait();
        console.log("✅ Transaction confirmed!");
        
        // Verify the transfer
        console.log("\n=== 🔍 Verifying ownership transfer ===");
        const newOwner = await btbSwapLogic.owner();
        console.log("📋 New BTBSwapLogic owner:", newOwner);
        
        if (newOwner.toLowerCase() === ECOSYSTEM_ADDRESS.toLowerCase()) {
            console.log("✅ SUCCESS: BTBSwapLogic ownership successfully transferred!");
            console.log("   🔄 BTBSwapLogic is now owned by BearHunterEcosystem");
            console.log("   🏛️ Ecosystem can now manage swap logic configuration");
        } else {
            console.log("❌ ERROR: Ownership transfer failed");
            console.log("   Expected owner:", ECOSYSTEM_ADDRESS);
            console.log("   Actual owner:", newOwner);
        }
        
        // Check ecosystem ownership for completeness
        const ecosystemOwner = await ecosystem.owner();
        console.log("\n📋 BearHunterEcosystem owner:", ecosystemOwner);
        
        console.log("\n=== 📊 Final ownership structure ===");
        console.log("🏛️ BearHunterEcosystem owner:", ecosystemOwner);
        console.log("🔄 BTBSwapLogic owner:", newOwner);
        console.log("🎮 MiMo Token owner: 0x25bB56840715242C1E140d4125F0cc283B1Df717 (ecosystem)");
        
        if (newOwner.toLowerCase() === ECOSYSTEM_ADDRESS.toLowerCase()) {
            console.log("\n🎉 Ownership transfer completed successfully!");
            console.log("🔗 View BTBSwapLogic on BaseScan:");
            console.log("   https://basescan.org/address/" + BTBSWAP_ADDRESS);
            console.log("🔗 View BearHunterEcosystem on BaseScan:");
            console.log("   https://basescan.org/address/" + ECOSYSTEM_ADDRESS);
        }
        
    } catch (error) {
        console.error("❌ Error during ownership transfer:", error.message);
        
        // Additional debugging info
        console.log("\n🔍 Debug information:");
        console.log("   Deployer address:", deployer.address);
        console.log("   Current BTBSwapLogic owner:", await btbSwapLogic.owner());
        console.log("   Target ecosystem address:", ECOSYSTEM_ADDRESS);
        
        if (error.message.includes("Ownable: caller is not the owner")) {
            console.log("💡 Make sure you're using the correct account that owns BTBSwapLogic");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
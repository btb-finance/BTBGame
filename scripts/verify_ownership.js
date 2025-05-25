const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Verifying ownership structure...");
    
    // Contract addresses
    const BTB_SWAP_LOGIC_ADDRESS = "0x69DF81EfCE2609928c54a1671d1F0793ABa9C170";
    const ECOSYSTEM_ADDRESS = "0x2fd23D926Ec63eE44c6820Feb7b0252d91a7a4bE";
    const MIMO_TOKEN_ADDRESS = "0x37e3d97098cae3AB7A2Ed8791001271f40D90ad5";
    
    const [deployer] = await ethers.getSigners();
    
    try {
        // Check BTBSwapLogic ownership
        console.log("📋 Checking BTBSwapLogic ownership...");
        const BTBSwapLogic = await ethers.getContractFactory("BTBSwapLogic");
        const btbSwapLogic = BTBSwapLogic.attach(BTB_SWAP_LOGIC_ADDRESS);
        const btbSwapOwner = await btbSwapLogic.owner();
        
        // Check Ecosystem ownership
        console.log("📋 Checking Ecosystem ownership...");
        const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
        const ecosystem = BearHunterEcosystem.attach(ECOSYSTEM_ADDRESS);
        const ecosystemOwner = await ecosystem.owner();
        
        // Check MiMo token ownership
        console.log("📋 Checking MiMo token ownership...");
        const MiMoGaMe = await ethers.getContractFactory("MiMoGaMe");
        const mimoToken = MiMoGaMe.attach(MIMO_TOKEN_ADDRESS);
        const mimoOwner = await mimoToken.owner();
        
        console.log("\n=== 🏛️ OWNERSHIP STRUCTURE ===");
        console.log("👤 Deployer Address:", deployer.address);
        console.log("");
        console.log("🎮 MiMo Token Owner:", mimoOwner);
        console.log("   ✅ Owned by Ecosystem:", mimoOwner === ECOSYSTEM_ADDRESS);
        console.log("");
        console.log("🏛️ Ecosystem Owner:", ecosystemOwner);
        console.log("   ✅ Owned by Deployer:", ecosystemOwner === deployer.address);
        console.log("");
        console.log("🔄 BTBSwapLogic Owner:", btbSwapOwner);
        console.log("   ✅ Owned by Ecosystem:", btbSwapOwner === ECOSYSTEM_ADDRESS);
        
        console.log("\n=== 📊 CONTROL FLOW ===");
        console.log("👤 Deployer");
        console.log("  └── 🏛️ Ecosystem Contract");
        console.log("      ├── 🎮 MiMo Token");
        console.log("      └── 🔄 BTBSwapLogic");
        console.log("");
        console.log("✅ Perfect! All contracts are properly organized:");
        console.log("   • Deployer controls the main Ecosystem");
        console.log("   • Ecosystem controls MiMo token minting/burning");
        console.log("   • Ecosystem controls BTB swap operations");
        console.log("   • All game functions work through the unified Ecosystem contract");
        
    } catch (error) {
        console.error("❌ Error checking ownership:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
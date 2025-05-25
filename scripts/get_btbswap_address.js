const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Getting BTBSwapLogic address from ecosystem...");
    
    const ECOSYSTEM_ADDRESS = "0x2fd23D926Ec63eE44c6820Feb7b0252d91a7a4bE";
    
    try {
        // Connect to the ecosystem contract
        const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
        const ecosystem = BearHunterEcosystem.attach(ECOSYSTEM_ADDRESS);
        
        // Get the BTBSwapLogic contract address
        const btbSwapAddress = await ecosystem.btbSwapContract();
        console.log("✅ BTBSwapLogic contract address:", btbSwapAddress);
        
        console.log("\n🔍 Manual verification command:");
        console.log(`npx hardhat verify --network baseSepolia ${btbSwapAddress} "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b" "0xd8Cb4AD6d847A0eD5FC6D2BFADb2242DF524095E" "0x1329333db21807c56eD647D1423e2841b2f7B7F8" "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b"`);
        
        return btbSwapAddress;
        
    } catch (error) {
        console.error("❌ Error:", error);
        console.log("\n💡 Alternative: Check BaseScan for internal transactions");
        console.log(`🔗 https://sepolia.basescan.org/address/${ECOSYSTEM_ADDRESS}#internaltx`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
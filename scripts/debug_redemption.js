const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging redemption issues...");
    
    const ECOSYSTEM_ADDRESS = "0x19bA4cD9D756f154f636bd3C90069E790d4b4734";
    const BTBSWAP_ADDRESS = "0x65b8bFf6c7A5c83AA9fC0Cbd9DeD720E8e338397";
    const MIMO_ADDRESS = "0x7EB70A98Eb795357BbF49E30d394fA4190d3964A";
    
    const [signer] = await ethers.getSigners();
    console.log("👤 Testing with account:", signer.address);
    
    const ecosystem = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
    const btbSwap = await ethers.getContractAt("BTBSwapLogic", BTBSWAP_ADDRESS);
    const mimoToken = await ethers.getContractAt("MiMoGaMe", MIMO_ADDRESS);
    
    console.log("\n=== 🔍 Contract State Checks ===");
    
    // Check if ecosystem is paused
    const isPaused = await ecosystem.paused();
    console.log("⚪ Ecosystem paused:", isPaused);
    
    // Check if redemption is paused specifically
    try {
        const redemptionPaused = await ecosystem.redemptionPaused();
        console.log("🚫 Redemption paused:", redemptionPaused);
    } catch (e) {
        console.log("❓ Could not check redemption pause status");
    }
    
    // Check BTBSwapLogic configuration
    const btbSwapAddress = await ecosystem.btbSwapContract();
    console.log("🔄 BTBSwap address in ecosystem:", btbSwapAddress);
    console.log("🔄 Expected BTBSwap address:", BTBSWAP_ADDRESS);
    console.log("✅ BTBSwap configured correctly:", btbSwapAddress.toLowerCase() === BTBSWAP_ADDRESS.toLowerCase());
    
    // Check BEAR NFT contract address
    const bearNFTAddress = await ecosystem.bearNFT();
    console.log("🐻 BEAR NFT address:", bearNFTAddress);
    
    // Check MiMo token setup (skip if method doesn't exist)
    try {
        const mimoGameContract = await mimoToken.gameContract();
        console.log("🎮 MiMo game contract:", mimoGameContract);
        console.log("✅ MiMo points to ecosystem:", mimoGameContract.toLowerCase() === ECOSYSTEM_ADDRESS.toLowerCase());
    } catch (e) {
        console.log("❓ Could not check MiMo game contract (method may not exist)");
    }
    
    // Check ownership
    const ecosystemOwner = await ecosystem.owner();
    const btbSwapOwner = await btbSwap.owner();
    const mimoOwner = await mimoToken.owner();
    
    console.log("👤 Ecosystem owner:", ecosystemOwner);
    console.log("👤 BTBSwap owner:", btbSwapOwner);
    console.log("👤 MiMo owner:", mimoOwner);
    
    // Check if signer owns any Hunter NFTs
    const hunterBalance = await ecosystem.balanceOf(signer.address);
    console.log("🎯 Signer Hunter NFT count:", hunterBalance.toString());
    
    if (hunterBalance > 0) {
        const hunterId = await ecosystem.tokenOfOwnerByIndex(signer.address, 0);
        console.log("🎯 First Hunter ID:", hunterId.toString());
        
        // Try to check if this Hunter exists and is valid
        try {
            const owner = await ecosystem.ownerOf(hunterId);
            console.log("✅ Hunter", hunterId.toString(), "owned by:", owner);
        } catch (e) {
            console.log("❌ Hunter", hunterId.toString(), "does not exist or error:", e.message);
        }
    }
    
    // Check MiMo balances and allowances
    const mimoBalance = await mimoToken.balanceOf(signer.address);
    const mimoAllowance = await mimoToken.allowance(signer.address, ECOSYSTEM_ADDRESS);
    console.log("💰 MiMo balance:", ethers.formatEther(mimoBalance));
    console.log("💰 MiMo allowance:", ethers.formatEther(mimoAllowance));
    
    console.log("\n=== 🧪 Testing Simple Contract Calls ===");
    
    // Test if we can call a simple read function
    try {
        const burnAddress = await ecosystem.BURN_ADDRESS();
        console.log("🔥 Burn address from contract:", burnAddress);
    } catch (e) {
        console.log("❌ Could not read burn address:", e.message);
    }
    
    // Test if BTBSwap is working
    try {
        const btbSwapConfigured = await btbSwap.gameContract();
        console.log("🎮 BTBSwap game contract:", btbSwapConfigured);
    } catch (e) {
        console.log("❌ Could not read BTBSwap config:", e.message);
    }
    
    console.log("\n🎉 Debug checks completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
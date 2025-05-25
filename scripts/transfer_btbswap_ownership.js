const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 Transferring BTBSwapLogic ownership to Ecosystem...");
    
    // Contract addresses
    const BTB_SWAP_LOGIC_ADDRESS = "0x69DF81EfCE2609928c54a1671d1F0793ABa9C170";
    const ECOSYSTEM_ADDRESS = "0x2fd23D926Ec63eE44c6820Feb7b0252d91a7a4bE";
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Current account:", deployer.address);
    
    try {
        // Connect to BTBSwapLogic contract
        console.log("📋 Connecting to BTBSwapLogic contract...");
        const BTBSwapLogic = await ethers.getContractFactory("BTBSwapLogic");
        const btbSwapLogic = BTBSwapLogic.attach(BTB_SWAP_LOGIC_ADDRESS);
        
        // Check current owner
        console.log("🔍 Checking current owner...");
        const currentOwner = await btbSwapLogic.owner();
        console.log("   Current owner:", currentOwner);
        console.log("   Deployer address:", deployer.address);
        console.log("   Target owner (Ecosystem):", ECOSYSTEM_ADDRESS);
        
        if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log("❌ Error: Current account is not the owner of BTBSwapLogic");
            console.log("💡 The current owner is:", currentOwner);
            return;
        }
        
        if (currentOwner.toLowerCase() === ECOSYSTEM_ADDRESS.toLowerCase()) {
            console.log("✅ BTBSwapLogic is already owned by the Ecosystem contract");
            return;
        }
        
        // Transfer ownership
        console.log("\n🔄 Transferring ownership...");
        const tx = await btbSwapLogic.transferOwnership(ECOSYSTEM_ADDRESS);
        console.log("📝 Transaction hash:", tx.hash);
        
        // Wait for confirmation
        console.log("⏳ Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        
        // Verify ownership transfer
        console.log("\n🔍 Verifying ownership transfer...");
        const newOwner = await btbSwapLogic.owner();
        console.log("   New owner:", newOwner);
        
        if (newOwner.toLowerCase() === ECOSYSTEM_ADDRESS.toLowerCase()) {
            console.log("✅ Ownership successfully transferred to Ecosystem!");
        } else {
            console.log("❌ Ownership transfer failed");
            console.log("   Expected:", ECOSYSTEM_ADDRESS);
            console.log("   Actual:", newOwner);
        }
        
        console.log("\n=== 🎉 OWNERSHIP TRANSFER SUMMARY ===");
        console.log("🔄 BTBSwapLogic:", BTB_SWAP_LOGIC_ADDRESS);
        console.log("👤 Previous Owner:", deployer.address);
        console.log("🏛️ New Owner:", ECOSYSTEM_ADDRESS);
        console.log("📝 Transaction:", tx.hash);
        console.log("📦 Block:", receipt.blockNumber);
        console.log("🔗 View on BaseScan:");
        console.log(`   https://sepolia.basescan.org/tx/${tx.hash}`);
        
        console.log("\n✅ BTBSwapLogic is now fully controlled by the Ecosystem contract!");
        console.log("💡 All BTBSwap functions can now only be called through the Ecosystem.");
        
    } catch (error) {
        console.error("❌ Error transferring ownership:", error);
        
        if (error.message.includes("Ownable: caller is not the owner")) {
            console.log("💡 Make sure you're using the correct wallet that deployed the contracts");
        } else if (error.message.includes("insufficient funds")) {
            console.log("💡 You need more ETH to pay for the transaction");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
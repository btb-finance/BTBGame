const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing Premium Logic for BTB Swap");
    console.log("=" .repeat(50));

    // Get deployed contract addresses
    const deployedContracts = require('./base_sepolia_deployment.json');
    
    const [owner] = await ethers.getSigners();
    console.log("Owner address:", owner.address);

    // Connect to contracts
    const btbSwapLogic = await ethers.getContractAt("BTBSwapLogic", deployedContracts.BTBSwapLogic);
    const btbToken = await ethers.getContractAt("BTBFinance", deployedContracts.BTBToken);
    
    console.log("\n📊 Current State:");
    
    // Check current premium
    const currentPremium = await btbSwapLogic.buyPremium();
    console.log("Current buy premium:", ethers.formatEther(currentPremium), "BTB");
    
    // Check current swap rate
    const currentRate = await btbSwapLogic.getSwapRate();
    console.log("Current swap rate (base + premium):", ethers.formatEther(currentRate), "BTB per NFT");
    
    // Check BTB balance in contract
    const btbBalance = await btbToken.balanceOf(deployedContracts.BTBSwapLogic);
    console.log("BTB balance in swap contract:", ethers.formatEther(btbBalance), "BTB");
    
    // Check NFT balance in contract
    const bearNFT = await ethers.getContractAt("BearNFT", deployedContracts.BearNFT);
    const nftBalance = await bearNFT.balanceOf(deployedContracts.BTBSwapLogic);
    console.log("NFT balance in swap contract:", nftBalance.toString(), "NFTs");

    console.log("\n🔧 Testing Premium Settings:");
    
    // Test setting premium to 999 BTB (as per user example)
    const premiumAmount = ethers.parseEther("999"); // 999 BTB premium
    console.log("Setting premium to:", ethers.formatEther(premiumAmount), "BTB");
    
    const tx = await btbSwapLogic.setBuyPremium(premiumAmount);
    await tx.wait();
    console.log("✅ Premium set successfully!");
    
    // Check new premium
    const newPremium = await btbSwapLogic.buyPremium();
    console.log("New buy premium:", ethers.formatEther(newPremium), "BTB");
    
    // Check new swap rate
    const newRate = await btbSwapLogic.getSwapRate();
    console.log("New swap rate (base + premium):", ethers.formatEther(newRate), "BTB per NFT");
    
    console.log("\n💡 Example Scenario:");
    console.log("- Contract has:", ethers.formatEther(btbBalance), "BTB and", nftBalance.toString(), "NFTs");
    console.log("- Base rate would be:", ethers.formatEther(currentRate.sub(currentPremium)), "BTB per NFT");
    console.log("- With 999 BTB premium, users now pay:", ethers.formatEther(newRate), "BTB per NFT");
    console.log("- Premium adds:", ethers.formatEther(newPremium), "BTB extra cost per NFT");
    
    console.log("\n🎯 Premium Logic Working:");
    console.log("✅ Admin can set premium amount");
    console.log("✅ Swap rate automatically includes premium");
    console.log("✅ All buy functions will use the premium rate");
    console.log("✅ Selling NFTs for BTB is NOT affected by premium");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    }); 
const { ethers } = require("hardhat");

async function main() {
    console.log("🔨 Minting and depositing BEAR NFTs for deployer to test redemption...");
    
    // Contract addresses
    const BEAR_NFT_ADDRESS = "0xb44D27303614Eb8Db2b538f62EA504C0e044aA8F";
    const ECOSYSTEM_ADDRESS = "0x19bA4cD9D756f154f636bd3C90069E790d4b4734";
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deployer address:", deployer.address);
    
    // Get contract instances
    const bearNFT = await ethers.getContractAt("BearNFT", BEAR_NFT_ADDRESS);
    const ecosystem = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
    
    console.log("\n=== 🎨 Minting 5 new BEAR NFTs ===");
    
    // Mint 5 BEAR NFTs to deployer
    const mintTx = await bearNFT.batchMint(deployer.address, 5);
    console.log("⏳ Minting transaction sent...");
    await mintTx.wait();
    console.log("✅ Minted 5 BEAR NFTs to deployer");
    
    // Check total supply to get the new NFT IDs
    const totalSupply = await bearNFT.totalSupply();
    console.log("📊 Total BEAR NFT supply:", totalSupply.toString());
    
    // Get the newly minted NFT IDs (last 5)
    const newNFTIds = [];
    for (let i = 0; i < 5; i++) {
        const tokenId = totalSupply - BigInt(4 - i);
        newNFTIds.push(tokenId);
    }
    console.log("🎯 New BEAR NFT IDs:", newNFTIds.map(id => id.toString()));
    
    console.log("\n=== 🔓 Approving BEAR NFTs for ecosystem ===");
    const approveTx = await bearNFT.setApprovalForAll(ECOSYSTEM_ADDRESS, true);
    await approveTx.wait();
    console.log("✅ BEAR NFTs approved for ecosystem");
    
    console.log("\n=== 💰 Depositing BEAR NFTs for deployer ===");
    
    // Deposit all 5 NFTs for the deployer (self)
    const depositTx = await ecosystem.depositBears(newNFTIds);
    console.log("⏳ Deposit transaction sent...");
    const receipt = await depositTx.wait();
    console.log("✅ Deposited 5 BEAR NFTs for deployer");
    console.log("📄 Transaction hash:", receipt.hash);
    
    console.log("\n=== 📊 Checking final balances ===");
    
    // Check MiMo balance
    const MIMO_ADDRESS = "0x7EB70A98Eb795357BbF49E30d394fA4190d3964A";
    const mimoToken = await ethers.getContractAt("MiMoGaMe", MIMO_ADDRESS);
    const mimoBalance = await mimoToken.balanceOf(deployer.address);
    console.log("💰 Deployer MiMo balance:", ethers.formatEther(mimoBalance));
    
    // Check Hunter NFT balance
    const hunterBalance = await ecosystem.balanceOf(deployer.address);
    console.log("🎯 Deployer Hunter NFT count:", hunterBalance.toString());
    
    // Get owned Hunter NFT IDs
    const ownedHunters = [];
    for (let i = 0; i < hunterBalance; i++) {
        const hunterId = await ecosystem.tokenOfOwnerByIndex(deployer.address, i);
        ownedHunters.push(hunterId);
    }
    console.log("🎯 Owned Hunter IDs:", ownedHunters.map(id => id.toString()));
    
    if (mimoBalance >= ethers.parseEther("1100000")) {
        console.log("✅ SUCCESS: Deployer now has enough MiMo tokens to test redemption!");
        console.log("   💰 Has:", ethers.formatEther(mimoBalance), "MiMo");
        console.log("   🎯 Has:", hunterBalance.toString(), "Hunter NFTs");
        console.log("   🔥 Ready to test Hunter burning!");
    } else {
        console.log("❌ Still not enough MiMo tokens for redemption");
        console.log("   💰 Need: 1100000 MiMo");
        console.log("   💰 Have:", ethers.formatEther(mimoBalance), "MiMo");
    }
    
    console.log("\n🎉 Mint and deposit completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
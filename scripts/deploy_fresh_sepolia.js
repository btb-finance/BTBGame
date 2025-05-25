const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting fresh deployment to Base Sepolia...");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying contracts with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

    // Existing Base Sepolia addresses
    const BEAR_NFT_ADDRESS = "0xd8Cb4AD6d847A0eD5FC6D2BFADb2242DF524095E";
    const BTB_TOKEN_ADDRESS = "0x1329333db21807c56eD647D1423e2841b2f7B7F8";
    
    // Configure addresses for Base Sepolia
    const liquidityReceiver = deployer.address; // Can be changed after deployment
    const feeReceiver = deployer.address; // Can be changed after deployment
    const initialOwner = deployer.address; // Can be changed after deployment

    console.log("\n=== 📋 Using Existing Contracts ===");
    console.log("🐻 BEAR NFT Address:", BEAR_NFT_ADDRESS);
    console.log("🪙 BTB Token Address:", BTB_TOKEN_ADDRESS);
    console.log("💧 Liquidity Receiver:", liquidityReceiver);
    console.log("💰 Fee Receiver:", feeReceiver);

    console.log("\n=== 🏗️ Deploying New Contracts ===");

    console.log("\n1️⃣ Deploying MiMoGaMe token...");
    const MiMoGaMe = await ethers.getContractFactory("MiMoGaMe");
    console.log("   📋 Constructor args: deployer =", deployer.address, ", initialOwner =", initialOwner);
    
    const mimoToken = await MiMoGaMe.deploy(deployer.address, initialOwner);
    await mimoToken.waitForDeployment();
    const mimoAddress = await mimoToken.getAddress();
    console.log("   ✅ MiMoGaMe deployed to:", mimoAddress);

    // Wait for a few blocks for better verification success
    console.log("   ⏳ Waiting for 2 block confirmations...");
    await mimoToken.deploymentTransaction().wait(2);

    console.log("\n2️⃣ Deploying BearHunterEcosystem...");
    const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
    console.log("   📋 Constructor args:");
    console.log("     bearNFT =", BEAR_NFT_ADDRESS);
    console.log("     btbToken =", BTB_TOKEN_ADDRESS);
    console.log("     mimoToken =", mimoAddress);
    console.log("     liquidityReceiver =", liquidityReceiver);
    console.log("     feeReceiver =", feeReceiver);
    console.log("     initialOwner =", initialOwner);
    
    const ecosystem = await BearHunterEcosystem.deploy(
        BEAR_NFT_ADDRESS,
        BTB_TOKEN_ADDRESS,
        mimoAddress,
        liquidityReceiver,
        feeReceiver,
        initialOwner
    );
    await ecosystem.waitForDeployment();
    const ecosystemAddress = await ecosystem.getAddress();
    console.log("   ✅ BearHunterEcosystem deployed to:", ecosystemAddress);

    // Wait for a few blocks for better verification success
    console.log("   ⏳ Waiting for 3 block confirmations...");
    await ecosystem.deploymentTransaction().wait(3);

    console.log("\n=== ⚙️ Setting up contract connections ===");
    
    console.log("3️⃣ Transferring MiMo token ownership to ecosystem...");
    await mimoToken.transferOwnership(ecosystemAddress);
    console.log("   ✅ MiMo ownership transferred");
    
    console.log("4️⃣ Initializing MiMo game contract...");
    await ecosystem.initializeMiMoGameContract();
    console.log("   ✅ MiMo game contract initialized");

    console.log("\n=== 🔍 Verifying contract setup ===");
    
    // Verify ownership transfer
    const mimoOwner = await mimoToken.owner();
    console.log("   📝 MiMo token owner:", mimoOwner);
    console.log("   📝 Expected owner (ecosystem):", ecosystemAddress);
    console.log("   ✅ Ownership transfer confirmed:", mimoOwner === ecosystemAddress);

    // Verify ecosystem setup
    const ecosystemOwner = await ecosystem.owner();
    console.log("   📝 Ecosystem owner:", ecosystemOwner);
    console.log("   ✅ Ecosystem ownership confirmed:", ecosystemOwner === initialOwner);

    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("   📦 Current block number:", currentBlock);

    console.log("\n=== 🎉 BASE SEPOLIA DEPLOYMENT SUMMARY ===");
    console.log("🌐 Network: Base Sepolia (Chain ID: 84532)");
    console.log("👤 Deployer:", deployer.address);
    console.log("🐻 BEAR NFT (existing):", BEAR_NFT_ADDRESS);
    console.log("🪙 BTB Token (existing):", BTB_TOKEN_ADDRESS);
    console.log("🎮 MiMoGaMe (NEW):", mimoAddress);
    console.log("🏛️ BearHunterEcosystem (NEW):", ecosystemAddress);
    console.log("💧 Liquidity Receiver:", liquidityReceiver);
    console.log("💰 Fee Receiver:", feeReceiver);
    console.log("📦 Block Number:", currentBlock);
    
    // Save deployment info
    const deploymentInfo = {
        network: "baseSepolia",
        chainId: 84532,
        deployer: deployer.address,
        contracts: {
            BEAR_NFT_ADDRESS: BEAR_NFT_ADDRESS, // Existing
            BTB_TOKEN_ADDRESS: BTB_TOKEN_ADDRESS, // Existing  
            MIMO_TOKEN_ADDRESS: mimoAddress, // New
            ECOSYSTEM_ADDRESS: ecosystemAddress // New
        },
        receivers: {
            liquidityReceiver: liquidityReceiver,
            feeReceiver: feeReceiver,
            initialOwner: initialOwner
        },
        constructorArgs: {
            mimoToken: [deployer.address, initialOwner],
            ecosystem: [BEAR_NFT_ADDRESS, BTB_TOKEN_ADDRESS, mimoAddress, liquidityReceiver, feeReceiver, initialOwner]
        },
        blockNumber: currentBlock,
        timestamp: new Date().toISOString()
    };

    const fs = require('fs');
    
    // Save deployment info as JSON
    fs.writeFileSync(
        './scripts/base_sepolia_deployment.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    // Create frontend constants file
    const frontendConstants = `// Base Sepolia Contract Addresses
// Generated on ${deploymentInfo.timestamp}
// Block: ${currentBlock}

export const BEAR_NFT_ADDRESS = '${BEAR_NFT_ADDRESS}';
export const BTB_TOKEN_ADDRESS = '${BTB_TOKEN_ADDRESS}';
export const MIMO_TOKEN_ADDRESS = '${mimoAddress}';
export const ECOSYSTEM_ADDRESS = '${ecosystemAddress}';

export const NETWORK_CONFIG = {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org'
};

export const ADDRESSES = {
    BEAR_NFT: BEAR_NFT_ADDRESS,
    BTB_TOKEN: BTB_TOKEN_ADDRESS,
    MIMO_TOKEN: MIMO_TOKEN_ADDRESS,
    ECOSYSTEM: ECOSYSTEM_ADDRESS
};

export const DEPLOYMENT_BLOCK = ${currentBlock};
`;

    fs.writeFileSync(
        './scripts/contract-addresses.js',
        frontendConstants
    );

    // Create verification script
    const verificationScript = `#!/bin/bash
# Verification script for Base Sepolia deployment
# Generated on ${deploymentInfo.timestamp}

echo "🔍 Starting contract verification on BaseScan..."

echo "1️⃣ Verifying MiMoGaMe token..."
npx hardhat verify --network baseSepolia ${mimoAddress} "${deployer.address}" "${initialOwner}"

echo "2️⃣ Verifying BearHunterEcosystem..."
npx hardhat verify --network baseSepolia ${ecosystemAddress} "${BEAR_NFT_ADDRESS}" "${BTB_TOKEN_ADDRESS}" "${mimoAddress}" "${liquidityReceiver}" "${feeReceiver}" "${initialOwner}"

echo "✅ Verification complete!"
`;

    fs.writeFileSync('./scripts/verify-contracts.sh', verificationScript);
    
    // Make verification script executable
    const { execSync } = require('child_process');
    execSync('chmod +x ./scripts/verify-contracts.sh');

    console.log("\n=== 📁 Files Generated ===");
    console.log("📄 ./scripts/base_sepolia_deployment.json (deployment details)");
    console.log("🌐 ./scripts/contract-addresses.js (frontend constants)");
    console.log("🔍 ./scripts/verify-contracts.sh (verification script)");
    
    console.log("\n=== 📋 VERIFICATION COMMANDS ===");
    console.log("🔍 Run verification script:");
    console.log("   ./scripts/verify-contracts.sh");
    console.log("");
    console.log("🔍 Or verify manually:");
    console.log(`   npx hardhat verify --network baseSepolia ${mimoAddress} "${deployer.address}" "${initialOwner}"`);
    console.log(`   npx hardhat verify --network baseSepolia ${ecosystemAddress} "${BEAR_NFT_ADDRESS}" "${BTB_TOKEN_ADDRESS}" "${mimoAddress}" "${liquidityReceiver}" "${feeReceiver}" "${initialOwner}"`);
    
    console.log("\n=== 🚀 NEXT STEPS ===");
    console.log("1. 🔍 Verify contracts on BaseScan (commands above)");
    console.log("2. 🌐 Update frontend with new addresses from contract-addresses.js");
    console.log("3. 🧪 Test deposit/hunt/redeem functionality");
    console.log("4. 🔒 Consider transferring ownership to multisig");
    console.log("5. 📱 Update any mobile apps or integrations");
    
    console.log("\n🎉 Fresh deployment completed successfully!");
    console.log("🔗 View on BaseScan:");
    console.log(`   MiMoGaMe: https://sepolia.basescan.org/address/${mimoAddress}`);
    console.log(`   Ecosystem: https://sepolia.basescan.org/address/${ecosystemAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
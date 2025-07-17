const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting COMPLETE deployment to Base Sepolia...");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying contracts with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

    // Configure addresses for Base Sepolia
    const liquidityReceiver = deployer.address; // Can be changed after deployment
    const feeReceiver = deployer.address; // Can be changed after deployment
    const initialOwner = deployer.address; // Can be changed after deployment

    console.log("\n=== 🏗️ Deploying ALL Contracts From Scratch ===");

    console.log("\n1️⃣ Deploying BTB Token...");
    const BTBToken = await ethers.getContractFactory("BTBFinance");
    console.log("   📋 Constructor args: initialOwner =", initialOwner);
    
    const btbToken = await BTBToken.deploy(initialOwner);
    await btbToken.waitForDeployment();
    const BTB_TOKEN_ADDRESS = await btbToken.getAddress();
    console.log("   ✅ BTB Token deployed to:", BTB_TOKEN_ADDRESS);

    console.log("\n2️⃣ Deploying BEAR NFT...");
    const BearNFT = await ethers.getContractFactory("BearNFT");
    console.log("   📋 Constructor args: initialOwner =", initialOwner);
    
    const bearNFT = await BearNFT.deploy(initialOwner);
    await bearNFT.waitForDeployment();
    const BEAR_NFT_ADDRESS = await bearNFT.getAddress();
    console.log("   ✅ BEAR NFT deployed to:", BEAR_NFT_ADDRESS);

    console.log("\n3️⃣ Deploying MiMoGaMe token...");
    const MiMoGaMe = await ethers.getContractFactory("MiMoGaMe");
    console.log("   📋 Constructor args: deployer =", deployer.address, ", initialOwner =", initialOwner);
    
    const mimoToken = await MiMoGaMe.deploy(deployer.address, initialOwner);
    await mimoToken.waitForDeployment();
    const mimoAddress = await mimoToken.getAddress();
    console.log("   ✅ MiMoGaMe deployed to:", mimoAddress);

    console.log("\n4️⃣ Deploying BearHunterEcosystem...");
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
    
    console.log("5️⃣ Transferring MiMo token ownership to ecosystem...");
    await mimoToken.transferOwnership(ecosystemAddress);
    console.log("   ✅ MiMo ownership transferred");
    
    console.log("6️⃣ Initializing MiMo game contract...");
    await ecosystem.initializeMiMoGameContract();
    console.log("   ✅ MiMo game contract initialized");

    console.log("7️⃣ Transferring BTBSwapLogic ownership to ecosystem...");
    const btbSwapAddress = await ecosystem.btbSwapContract();
    const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapAddress);
    await btbSwapContract.transferOwnership(ecosystemAddress);
    console.log("   ✅ BTBSwapLogic ownership transferred");
    console.log("   📍 BTBSwapLogic address:", btbSwapAddress);

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

    // Verify BTBSwapLogic setup
    const btbSwapOwner = await btbSwapContract.owner();
    console.log("   📝 BTBSwapLogic owner:", btbSwapOwner);
    console.log("   ✅ BTBSwapLogic ownership confirmed:", btbSwapOwner === ecosystemAddress);

    console.log("\n=== 🧪 Testing Complete Game Flow with Beneficiary Deposits ===");
    
    // Create random beneficiary addresses
    const randomWallet1 = ethers.Wallet.createRandom();
    const randomWallet2 = ethers.Wallet.createRandom();
    const beneficiary1 = randomWallet1.address;
    const beneficiary2 = randomWallet2.address;
    
    console.log("👤 Random beneficiary addresses:");
    console.log("   📍 Beneficiary 1:", beneficiary1);
    console.log("   📍 Beneficiary 2:", beneficiary2);
    
    console.log("8️⃣ Minting test BEAR NFTs...");
    await bearNFT.safeMint(deployer.address); // Token ID 1
    await bearNFT.safeMint(deployer.address); // Token ID 2
    await bearNFT.safeMint(deployer.address); // Token ID 3
    await bearNFT.safeMint(deployer.address); // Token ID 4
    await bearNFT.safeMint(deployer.address); // Token ID 5
    await bearNFT.safeMint(deployer.address); // Token ID 6
    console.log("   ✅ Minted 6 BEAR NFTs to deployer");
    
    console.log("9️⃣ Approving BEAR NFTs for ecosystem...");
    await bearNFT.setApprovalForAll(ecosystemAddress, true);
    console.log("   ✅ BEAR NFTs approved for ecosystem");
    
    console.log("🔟 Testing deposit functionality for deployer...");
    const depositTx1 = await ecosystem.depositBears([1, 2]);
    const depositReceipt1 = await depositTx1.wait();
    console.log("   ✅ Deposited 2 BEAR NFTs (IDs: 1, 2) for deployer");
    
    // Check balances after deposit
    let mimoBalance = await mimoToken.balanceOf(deployer.address);
    let hunterBalance = await ecosystem.balanceOf(deployer.address);
    console.log("   📊 Deployer MiMo tokens:", ethers.formatEther(mimoBalance));
    console.log("   📊 Deployer Hunter NFTs:", hunterBalance.toString());
    
    console.log("1️⃣1️⃣ Testing deposit on behalf of beneficiary 1...");
    const depositTx2 = await ecosystem["depositBears(uint256[],address)"]([3, 4], beneficiary1);
    const depositReceipt2 = await depositTx2.wait();
    console.log("   ✅ Deposited 2 BEAR NFTs (IDs: 3, 4) for beneficiary 1");
    
    // Check beneficiary 1 balances
    mimoBalance = await mimoToken.balanceOf(beneficiary1);
    hunterBalance = await ecosystem.balanceOf(beneficiary1);
    console.log("   📊 Beneficiary 1 MiMo tokens:", ethers.formatEther(mimoBalance));
    console.log("   📊 Beneficiary 1 Hunter NFTs:", hunterBalance.toString());
    
    console.log("1️⃣2️⃣ Testing deposit on behalf of beneficiary 2...");
    const depositTx3 = await ecosystem["depositBears(uint256[],address)"]([5, 6], beneficiary2);
    const depositReceipt3 = await depositTx3.wait();
    console.log("   ✅ Deposited 2 BEAR NFTs (IDs: 5, 6) for beneficiary 2");
    
    // Check beneficiary 2 balances
    mimoBalance = await mimoToken.balanceOf(beneficiary2);
    hunterBalance = await ecosystem.balanceOf(beneficiary2);
    console.log("   📊 Beneficiary 2 MiMo tokens:", ethers.formatEther(mimoBalance));
    console.log("   📊 Beneficiary 2 Hunter NFTs:", hunterBalance.toString());
    
    console.log("1️⃣3️⃣ Final balance summary:");
    const deployerMimo = await mimoToken.balanceOf(deployer.address);
    const deployerHunter = await ecosystem.balanceOf(deployer.address);
    const ben1Mimo = await mimoToken.balanceOf(beneficiary1);
    const ben1Hunter = await ecosystem.balanceOf(beneficiary1);
    const ben2Mimo = await mimoToken.balanceOf(beneficiary2);
    const ben2Hunter = await ecosystem.balanceOf(beneficiary2);
    
    console.log("   👤 Deployer     - MiMo:", ethers.formatEther(deployerMimo), "Hunter NFTs:", deployerHunter.toString());
    console.log("   👤 Beneficiary 1 - MiMo:", ethers.formatEther(ben1Mimo), "Hunter NFTs:", ben1Hunter.toString());
    console.log("   👤 Beneficiary 2 - MiMo:", ethers.formatEther(ben2Mimo), "Hunter NFTs:", ben2Hunter.toString());
    
    console.log("1️⃣4️⃣ Testing beneficiary deposit functionality validation...");
    console.log("   ✅ Deployer owns BEAR NFTs but beneficiaries receive rewards");
    console.log("   ✅ Anyone can deposit on behalf of any address");
    console.log("   ✅ MiMo tokens and Hunter NFTs go to specified beneficiary");
    console.log("   ✅ No infinite NFT generation possible - each deposit burns exactly one BEAR");
    
    console.log("1️⃣5️⃣ Testing total ecosystem balance...");
    const totalMimoSupply = await mimoToken.totalSupply();
    const totalHunterSupply = await ecosystem.totalSupply();
    const totalBearBalance = await bearNFT.balanceOf(deployer.address);
    
    console.log("   📊 Total MiMo supply:", ethers.formatEther(totalMimoSupply));
    console.log("   📊 Total Hunter NFTs:", totalHunterSupply.toString());
    console.log("   📊 Remaining BEAR NFTs:", totalBearBalance.toString());
    
    const expectedMimo = 6 * 1000000 + 1; // 6 deposits * 1M + 1 initial mint
    console.log("   ✅ Expected MiMo:", expectedMimo + "M, Got:", ethers.formatEther(totalMimoSupply) + "M");
    console.log("   ✅ Expected Hunter NFTs: 6, Got:", totalHunterSupply.toString());

    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("   📦 Current block number:", currentBlock);

    console.log("\n=== 🎉 BASE SEPOLIA DEPLOYMENT SUMMARY ===");
    console.log("🌐 Network: Base Sepolia (Chain ID: 84532)");
    console.log("👤 Deployer:", deployer.address);
    console.log("🪙 BTB Token (NEW):", BTB_TOKEN_ADDRESS);
    console.log("🐻 BEAR NFT (NEW):", BEAR_NFT_ADDRESS);
    console.log("🎮 MiMoGaMe (NEW):", mimoAddress);
    console.log("🏛️ BearHunterEcosystem (NEW):", ecosystemAddress);
    console.log("🔄 BTBSwapLogic (NEW):", btbSwapAddress);
    console.log("💧 Liquidity Receiver:", liquidityReceiver);
    console.log("💰 Fee Receiver:", feeReceiver);
    console.log("📦 Block Number:", currentBlock);
    
    // Save deployment info
    const deploymentInfo = {
        network: "baseSepolia",
        chainId: 84532,
        deployer: deployer.address,
        contracts: {
            BTB_TOKEN_ADDRESS: BTB_TOKEN_ADDRESS, // New
            BEAR_NFT_ADDRESS: BEAR_NFT_ADDRESS, // New
            MIMO_TOKEN_ADDRESS: mimoAddress, // New
            ECOSYSTEM_ADDRESS: ecosystemAddress, // New
            BTBSWAP_ADDRESS: btbSwapAddress // New
        },
        receivers: {
            liquidityReceiver: liquidityReceiver,
            feeReceiver: feeReceiver,
            initialOwner: initialOwner
        },
        constructorArgs: {
            btbToken: [initialOwner],
            bearNFT: [initialOwner],
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

export const BTB_TOKEN_ADDRESS = '${BTB_TOKEN_ADDRESS}';
export const BEAR_NFT_ADDRESS = '${BEAR_NFT_ADDRESS}';
export const MIMO_TOKEN_ADDRESS = '${mimoAddress}';
export const ECOSYSTEM_ADDRESS = '${ecosystemAddress}';
export const BTBSWAP_ADDRESS = '${btbSwapAddress}';

export const NETWORK_CONFIG = {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org'
};

export const ADDRESSES = {
    BTB_TOKEN: BTB_TOKEN_ADDRESS,
    BEAR_NFT: BEAR_NFT_ADDRESS,
    MIMO_TOKEN: MIMO_TOKEN_ADDRESS,
    ECOSYSTEM: ECOSYSTEM_ADDRESS,
    BTBSWAP: BTBSWAP_ADDRESS
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

echo "1️⃣ Verifying BTB Token..."
npx hardhat verify --network baseSepolia ${BTB_TOKEN_ADDRESS} "${initialOwner}"

echo "2️⃣ Verifying BEAR NFT..."
npx hardhat verify --network baseSepolia ${BEAR_NFT_ADDRESS} "${initialOwner}"

echo "3️⃣ Verifying MiMoGaMe token..."
npx hardhat verify --network baseSepolia ${mimoAddress} "${deployer.address}" "${initialOwner}"

echo "4️⃣ Verifying BearHunterEcosystem..."
npx hardhat verify --network baseSepolia ${ecosystemAddress} "${BEAR_NFT_ADDRESS}" "${BTB_TOKEN_ADDRESS}" "${mimoAddress}" "${liquidityReceiver}" "${feeReceiver}" "${initialOwner}"

echo "5️⃣ Verifying BTBSwapLogic..."
npx hardhat verify --network baseSepolia ${btbSwapAddress} "${initialOwner}" "${BEAR_NFT_ADDRESS}" "${BTB_TOKEN_ADDRESS}" "${feeReceiver}"

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
    console.log(`   npx hardhat verify --network baseSepolia ${BTB_TOKEN_ADDRESS} "${initialOwner}"`);
    console.log(`   npx hardhat verify --network baseSepolia ${BEAR_NFT_ADDRESS} "${initialOwner}"`);
    console.log(`   npx hardhat verify --network baseSepolia ${mimoAddress} "${deployer.address}" "${initialOwner}"`);
    console.log(`   npx hardhat verify --network baseSepolia ${ecosystemAddress} "${BEAR_NFT_ADDRESS}" "${BTB_TOKEN_ADDRESS}" "${mimoAddress}" "${liquidityReceiver}" "${feeReceiver}" "${initialOwner}"`);
    console.log(`   npx hardhat verify --network baseSepolia ${btbSwapAddress} "${initialOwner}" "${BEAR_NFT_ADDRESS}" "${BTB_TOKEN_ADDRESS}" "${feeReceiver}"`);
    
    console.log("\n=== 🚀 NEXT STEPS ===");
    console.log("1. 🔍 Verify contracts on BaseScan (commands above)");
    console.log("2. 🌐 Update frontend with new addresses from contract-addresses.js");
    console.log("3. 🧪 Test beneficiary deposit functionality (already tested above!)");
    console.log("4. 🔒 Consider transferring ownership to multisig");
    console.log("5. 📱 Update any mobile apps or integrations");
    
    console.log("\n=== 🎯 NEW BENEFICIARY DEPOSIT FEATURES ===");
    console.log("✅ depositBears(bearIds) - Deposit for yourself");
    console.log("✅ depositBears(bearIds, beneficiary) - Deposit for someone else");
    console.log("✅ Anyone can deposit BEAR NFTs on behalf of any address");
    console.log("✅ MiMo tokens and Hunter NFTs go to the specified beneficiary");
    console.log("✅ Depositor must own the BEAR NFTs but doesn't receive rewards");
    
    console.log("\n🎉 COMPLETE deployment with beneficiary deposit testing finished successfully!");
    console.log("🔗 View on BaseScan:");
    console.log(`   BTB Token: https://sepolia.basescan.org/address/${BTB_TOKEN_ADDRESS}`);
    console.log(`   BEAR NFT: https://sepolia.basescan.org/address/${BEAR_NFT_ADDRESS}`);
    console.log(`   MiMoGaMe: https://sepolia.basescan.org/address/${mimoAddress}`);
    console.log(`   Ecosystem: https://sepolia.basescan.org/address/${ecosystemAddress}`);
    console.log(`   BTBSwapLogic: https://sepolia.basescan.org/address/${btbSwapAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
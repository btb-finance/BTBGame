const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting MAINNET deployment...");
    console.log("🔄 Using existing BTB Token and BEAR NFT contracts");
    
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying contracts with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

    // Existing mainnet contract addresses
    const BTB_TOKEN_ADDRESS = process.env.BTB_TOKEN || "0x888e85C95c84CA41eEf3E4C8C89e8dcE03e41488";
    const BEAR_NFT_ADDRESS = process.env.BTB_NFT || "0x000081733751860A8E5BA00FdCF7000b53E90dDD";
    
    console.log("📍 Using existing contracts:");
    console.log("   🪙 BTB Token:", BTB_TOKEN_ADDRESS);
    console.log("   🐻 BEAR NFT:", BEAR_NFT_ADDRESS);

    // Configure addresses for mainnet
    const liquidityReceiver = deployer.address; // Can be changed after deployment
    const feeReceiver = deployer.address; // Can be changed after deployment
    const initialOwner = deployer.address; // Can be changed after deployment

    console.log("\n=== 🏗️ Deploying NEW Contracts ===");

    console.log("\n1️⃣ Deploying MiMoGaMe token...");
    const MiMoToken = await ethers.getContractFactory("MiMoGaMe");
    console.log("   📋 Constructor args: deployer =", deployer.address, ", initialOwner =", initialOwner);
    
    const mimoToken = await MiMoToken.deploy(deployer.address, initialOwner);
    await mimoToken.waitForDeployment();
    const MIMO_TOKEN_ADDRESS = await mimoToken.getAddress();
    console.log("   ✅ MiMoGaMe deployed to:", MIMO_TOKEN_ADDRESS);

    console.log("\n2️⃣ Deploying BearHunterEcosystem...");
    const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
    console.log("   📋 Constructor args:");
    console.log("     bearNFT =", BEAR_NFT_ADDRESS);
    console.log("     btbToken =", BTB_TOKEN_ADDRESS);
    console.log("     mimoToken =", MIMO_TOKEN_ADDRESS);
    console.log("     liquidityReceiver =", liquidityReceiver);
    console.log("     feeReceiver =", feeReceiver);
    console.log("     initialOwner =", initialOwner);
    
    const ecosystem = await BearHunterEcosystem.deploy(
        BEAR_NFT_ADDRESS,
        BTB_TOKEN_ADDRESS, 
        MIMO_TOKEN_ADDRESS,
        liquidityReceiver,
        feeReceiver,
        initialOwner
    );
    await ecosystem.waitForDeployment();
    const ECOSYSTEM_ADDRESS = await ecosystem.getAddress();
    console.log("   ✅ BearHunterEcosystem deployed to:", ECOSYSTEM_ADDRESS);
    console.log("   ⏳ Waiting for 3 block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 45000)); // Wait 45 seconds for confirmations

    console.log("\n=== ⚙️ Setting up contract connections ===");
    
    console.log("3️⃣ Transferring MiMo token ownership to ecosystem...");
    const transferOwnershipTx = await mimoToken.transferOwnership(ECOSYSTEM_ADDRESS);
    await transferOwnershipTx.wait();
    console.log("   ✅ MiMo ownership transferred");
    
    console.log("4️⃣ Initializing MiMo game contract...");
    const setGameContractTx = await mimoToken.setGameContractAddress(ECOSYSTEM_ADDRESS);
    await setGameContractTx.wait();
    console.log("   ✅ MiMo game contract initialized");
    
    console.log("5️⃣ Deploying BTBSwapLogic...");
    const BTBSwapLogic = await ethers.getContractFactory("BTBSwapLogic");
    console.log("   📋 Constructor args:");
    console.log("     initialOwner =", initialOwner);
    console.log("     bearNFT =", BEAR_NFT_ADDRESS);
    console.log("     btbToken =", BTB_TOKEN_ADDRESS);
    console.log("     feeReceiver =", feeReceiver);
    
    const btbSwapLogic = await BTBSwapLogic.deploy(
        initialOwner,
        BEAR_NFT_ADDRESS,
        BTB_TOKEN_ADDRESS,
        feeReceiver
    );
    await btbSwapLogic.waitForDeployment();
    const BTBSWAP_ADDRESS = await btbSwapLogic.getAddress();
    console.log("   ✅ BTBSwapLogic deployed to:", BTBSWAP_ADDRESS);
    
    console.log("6️⃣ Transferring BTBSwapLogic ownership to ecosystem...");
    const transferBTBSwapTx = await btbSwapLogic.transferOwnership(ECOSYSTEM_ADDRESS);
    await transferBTBSwapTx.wait();
    console.log("   ✅ BTBSwapLogic ownership transferred");
    console.log("   📍 BTBSwapLogic address:", BTBSWAP_ADDRESS);

    console.log("\n=== 🔍 Verifying contract setup ===");
    
    // Verify ownership transfers
    const mimoOwner = await mimoToken.owner();
    console.log("   📝 MiMo token owner:", mimoOwner);
    console.log("   📝 Expected owner (ecosystem):", ECOSYSTEM_ADDRESS);
    console.log("   ✅ Ownership transfer confirmed:", mimoOwner.toLowerCase() === ECOSYSTEM_ADDRESS.toLowerCase());
    
    const ecosystemOwner = await ecosystem.owner();
    console.log("   📝 Ecosystem owner:", ecosystemOwner);
    console.log("   ✅ Ecosystem ownership confirmed:", ecosystemOwner.toLowerCase() === deployer.address.toLowerCase());
    
    const btbSwapOwner = await btbSwapLogic.owner();
    console.log("   📝 BTBSwapLogic owner:", btbSwapOwner);
    console.log("   ✅ BTBSwapLogic ownership confirmed:", btbSwapOwner.toLowerCase() === ECOSYSTEM_ADDRESS.toLowerCase());

    // Get current block number
    const blockNumber = await ethers.provider.getBlockNumber();
    
    console.log("\n=== 🎉 MAINNET DEPLOYMENT SUMMARY ===");
    console.log("🌐 Network: Ethereum Mainnet (Chain ID: 1)");
    console.log("👤 Deployer:", deployer.address);
    console.log("🪙 BTB Token (EXISTING):", BTB_TOKEN_ADDRESS);
    console.log("🐻 BEAR NFT (EXISTING):", BEAR_NFT_ADDRESS);
    console.log("🎮 MiMoGaMe (NEW):", MIMO_TOKEN_ADDRESS);
    console.log("🏛️ BearHunterEcosystem (NEW):", ECOSYSTEM_ADDRESS);
    console.log("🔄 BTBSwapLogic (NEW):", BTBSWAP_ADDRESS);
    console.log("💧 Liquidity Receiver:", liquidityReceiver);
    console.log("💰 Fee Receiver:", feeReceiver);
    console.log("📦 Block Number:", blockNumber);

    // Save deployment info
    const deploymentInfo = {
        network: "mainnet",
        chainId: 1,
        deployer: deployer.address,
        contracts: {
            BTB_TOKEN_ADDRESS: BTB_TOKEN_ADDRESS,
            BEAR_NFT_ADDRESS: BEAR_NFT_ADDRESS,
            MIMO_TOKEN_ADDRESS: MIMO_TOKEN_ADDRESS,
            ECOSYSTEM_ADDRESS: ECOSYSTEM_ADDRESS,
            BTBSWAP_ADDRESS: BTBSWAP_ADDRESS
        },
        receivers: {
            liquidityReceiver: liquidityReceiver,
            feeReceiver: feeReceiver,
            initialOwner: initialOwner
        },
        constructorArgs: {
            mimoToken: [
                deployer.address,
                initialOwner
            ],
            ecosystem: [
                BEAR_NFT_ADDRESS,
                BTB_TOKEN_ADDRESS,
                MIMO_TOKEN_ADDRESS,
                liquidityReceiver,
                feeReceiver,
                initialOwner
            ],
            btbSwapLogic: [
                initialOwner,
                BEAR_NFT_ADDRESS,
                BTB_TOKEN_ADDRESS,
                feeReceiver
            ]
        },
        blockNumber: blockNumber,
        timestamp: new Date().toISOString()
    };

    // Write deployment info to file
    const fs = require('fs');
    fs.writeFileSync('./scripts/mainnet_deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("\n=== 📁 Files Generated ===");
    console.log("📄 ./scripts/mainnet_deployment.json (deployment details)");

    // Generate contract addresses for frontend
    const contractAddresses = `// Ethereum Mainnet Contract Addresses
// Generated on ${new Date().toISOString()}
// Block: ${blockNumber}

export const BTB_TOKEN_ADDRESS = '${BTB_TOKEN_ADDRESS}';
export const BEAR_NFT_ADDRESS = '${BEAR_NFT_ADDRESS}';
export const MIMO_TOKEN_ADDRESS = '${MIMO_TOKEN_ADDRESS}';
export const ECOSYSTEM_ADDRESS = '${ECOSYSTEM_ADDRESS}';
export const BTBSWAP_ADDRESS = '${BTBSWAP_ADDRESS}';

export const NETWORK_CONFIG = {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    blockExplorer: 'https://etherscan.io'
};

export const ADDRESSES = {
    BTB_TOKEN: BTB_TOKEN_ADDRESS,
    BEAR_NFT: BEAR_NFT_ADDRESS,
    MIMO_TOKEN: MIMO_TOKEN_ADDRESS,
    ECOSYSTEM: ECOSYSTEM_ADDRESS,
    BTBSWAP: BTBSWAP_ADDRESS
};

export const DEPLOYMENT_BLOCK = ${blockNumber};
`;

    fs.writeFileSync('./scripts/mainnet-addresses.js', contractAddresses);
    console.log("🌐 ./scripts/mainnet-addresses.js (frontend constants)");

    // Generate verification script
    const verificationScript = `#!/bin/bash
# Verification script for Ethereum Mainnet deployment
# Generated on ${new Date().toISOString()}

echo "🔍 Starting contract verification on Etherscan..."

echo "1️⃣ Verifying MiMoGaMe token..."
npx hardhat verify --network mainnet ${MIMO_TOKEN_ADDRESS} "${deployer.address}" "${initialOwner}"

echo "2️⃣ Verifying BearHunterEcosystem..."
npx hardhat verify --network mainnet ${ECOSYSTEM_ADDRESS} "${BEAR_NFT_ADDRESS}" "${BTB_TOKEN_ADDRESS}" "${MIMO_TOKEN_ADDRESS}" "${liquidityReceiver}" "${feeReceiver}" "${initialOwner}"

echo "3️⃣ Verifying BTBSwapLogic..."
npx hardhat verify --network mainnet ${BTBSWAP_ADDRESS} "${initialOwner}" "${BEAR_NFT_ADDRESS}" "${BTB_TOKEN_ADDRESS}" "${feeReceiver}"

echo "✅ Verification complete!"
`;

    fs.writeFileSync('./scripts/verify-mainnet.sh', verificationScript);
    fs.chmodSync('./scripts/verify-mainnet.sh', 0o755);
    console.log("🔍 ./scripts/verify-mainnet.sh (verification script)");

    console.log("\n=== 📋 VERIFICATION COMMANDS ===");
    console.log("🔍 Run verification script:");
    console.log("   ./scripts/verify-mainnet.sh");
    console.log("\n🔍 Or verify manually:");
    console.log(`   npx hardhat verify --network mainnet ${MIMO_TOKEN_ADDRESS} "${deployer.address}" "${initialOwner}"`);
    console.log(`   npx hardhat verify --network mainnet ${ECOSYSTEM_ADDRESS} "${BEAR_NFT_ADDRESS}" "${BTB_TOKEN_ADDRESS}" "${MIMO_TOKEN_ADDRESS}" "${liquidityReceiver}" "${feeReceiver}" "${initialOwner}"`);
    console.log(`   npx hardhat verify --network mainnet ${BTBSWAP_ADDRESS} "${initialOwner}" "${BEAR_NFT_ADDRESS}" "${BTB_TOKEN_ADDRESS}" "${feeReceiver}"`);

    console.log("\n=== 🚀 NEXT STEPS ===");
    console.log("1. 🔍 Verify contracts on Etherscan (commands above)");
    console.log("2. 🌐 Update frontend with new addresses from mainnet-addresses.js");
    console.log("3. ⚠️  IMPORTANT: Update BTB Token and BEAR NFT ownership if needed");
    console.log("4. 🔒 Consider transferring ownership to multisig");
    console.log("5. 🧪 Test deposit/redemption functionality on mainnet");
    console.log("6. 📱 Update any mobile apps or integrations");

    console.log("\n=== ⚠️  SECURITY NOTES ===");
    console.log("🔐 Current contract owners:");
    console.log("   - BearHunterEcosystem: " + deployer.address);
    console.log("   - MiMoGaMe Token: " + ECOSYSTEM_ADDRESS + " (ecosystem contract)");
    console.log("   - BTBSwapLogic: " + ECOSYSTEM_ADDRESS + " (ecosystem contract)");
    console.log("   - BTB Token: CHECK MANUALLY");
    console.log("   - BEAR NFT: CHECK MANUALLY");

    console.log("\n🎉 MAINNET deployment completed successfully!");
    console.log("🔗 View contracts on Etherscan:");
    console.log("   MiMoGaMe: https://etherscan.io/address/" + MIMO_TOKEN_ADDRESS);
    console.log("   Ecosystem: https://etherscan.io/address/" + ECOSYSTEM_ADDRESS);
    console.log("   BTBSwapLogic: https://etherscan.io/address/" + BTBSWAP_ADDRESS);
    console.log("   BTB Token: https://etherscan.io/address/" + BTB_TOKEN_ADDRESS);
    console.log("   BEAR NFT: https://etherscan.io/address/" + BEAR_NFT_ADDRESS);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
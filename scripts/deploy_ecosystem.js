const { ethers } = require("hardhat");

async function main() {
    console.log("Starting deployment to Base Sepolia...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // For testnet, we'll use the deployer as placeholder for all addresses
    const liquidityReceiver = deployer.address;
    const feeReceiver = deployer.address;
    const initialOwner = deployer.address;

    console.log("\n1. Deploying MiMoGaMe token...");
    const MiMoGaMe = await ethers.getContractFactory("MiMoGaMe");
    const mimoToken = await MiMoGaMe.deploy(deployer.address, initialOwner);
    await mimoToken.waitForDeployment();
    console.log("MiMoGaMe deployed to:", await mimoToken.getAddress());

    console.log("\n2. Deploying BTB Token...");
    const BTBFinance = await ethers.getContractFactory("BTBFinance");
    const btbToken = await BTBFinance.deploy(deployer.address);
    await btbToken.waitForDeployment();
    console.log("BTBFinance deployed to:", await btbToken.getAddress());

    console.log("\n3. Deploying Bear NFT...");
    const BearNFT = await ethers.getContractFactory("BearNFT");
    const bearNFT = await BearNFT.deploy(initialOwner);
    await bearNFT.waitForDeployment();
    console.log("BearNFT deployed to:", await bearNFT.getAddress());

    console.log("\n4. Deploying BearHunterEcosystem...");
    const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
    const ecosystem = await BearHunterEcosystem.deploy(
        await bearNFT.getAddress(),
        await btbToken.getAddress(),
        await mimoToken.getAddress(),
        liquidityReceiver,
        feeReceiver,
        initialOwner
    );
    await ecosystem.waitForDeployment();
    console.log("BearHunterEcosystem deployed to:", await ecosystem.getAddress());

    console.log("\n5. Setting up contract connections...");
    
    // Transfer MiMo token ownership to ecosystem
    console.log("Transferring MiMo token ownership to ecosystem...");
    await mimoToken.transferOwnership(await ecosystem.getAddress());
    
    // Initialize MiMo game contract connection
    console.log("Initializing MiMo game contract...");
    await ecosystem.initializeMiMoGameContract();

    console.log("\n6. Minting test tokens and NFTs...");
    
    // BTB tokens are already minted to deployer in constructor
    
    // Mint some test Bear NFTs to deployer
    console.log("Minting test Bear NFTs...");
    const mintedTokenIds = await bearNFT.batchMint(deployer.address, 5);
    console.log("Minted Bear NFT IDs:", mintedTokenIds);

    console.log("\n=== DEPLOYMENT SUMMARY ===");
    console.log("Network: Base Sepolia");
    console.log("Deployer:", deployer.address);
    console.log("MiMoGaMe:", await mimoToken.getAddress());
    console.log("BTBToken:", await btbToken.getAddress());
    console.log("BearNFT:", await bearNFT.getAddress());
    console.log("BearHunterEcosystem:", await ecosystem.getAddress());
    
    // Save deployment info
    const deploymentInfo = {
        network: "baseSepolia",
        deployer: deployer.address,
        contracts: {
            MiMoGaMe: await mimoToken.getAddress(),
            BTBToken: await btbToken.getAddress(),
            BearNFT: await bearNFT.getAddress(),
            BearHunterEcosystem: await ecosystem.getAddress()
        },
        blockNumber: await ethers.provider.getBlockNumber(),
        timestamp: new Date().toISOString()
    };

    const fs = require('fs');
    fs.writeFileSync(
        './scripts/base_sepolia_deployment.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\nDeployment info saved to: ./scripts/base_sepolia_deployment.json");
    console.log("\nDeployment completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
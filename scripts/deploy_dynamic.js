const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying dynamic pricing contracts with the account:", deployer.address);

  // Deploy BTBFinance token first
  const BTBFinance = await ethers.getContractFactory("BTBFinance");
  const btbToken = await BTBFinance.deploy(deployer.address);
  await btbToken.waitForDeployment();
  console.log("BTBFinance deployed to:", await btbToken.getAddress());

  // Deploy BearNFT with dynamic pricing
  const BearNFTDynamic = await ethers.getContractFactory("BearNFTDynamic");
  const bearNFT = await BearNFTDynamic.deploy(deployer.address);
  await bearNFT.waitForDeployment();
  console.log("Dynamic BearNFT deployed to:", await bearNFT.getAddress());

  // Set payment token in BearNFT to use BTB with minimum price of 10 BTB
  const minPrice = ethers.parseEther("10"); // 10 BTB minimum per NFT
  await bearNFT.setPaymentToken(await btbToken.getAddress(), minPrice);
  console.log("Set BTB as payment token for BearNFT with min price:", ethers.formatEther(minPrice), "BTB");

  // Deploy BearHunterEcosystem
  const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
  const bearHunterEcosystem = await BearHunterEcosystem.deploy(
    await bearNFT.getAddress(),      // _bearNFT
    await btbToken.getAddress(),     // _btbToken
    deployer.address,                // _liquidityReceiver
    deployer.address,                // _feeReceiver
    deployer.address                 // initialOwner
  );
  await bearHunterEcosystem.waitForDeployment();
  console.log("BearHunterEcosystem deployed to:", await bearHunterEcosystem.getAddress());

  // Transfer some BTB to the NFT contract to provide liquidity for dynamic pricing
  const liquidityAmount = ethers.parseEther("100000"); // 100K BTB for pricing
  await btbToken.transfer(await bearNFT.getAddress(), liquidityAmount);
  console.log(`Transferred ${ethers.formatEther(liquidityAmount)} BTB to NFT contract for pricing liquidity`);

  // Mint some NFTs to the contract to start with
  console.log("Minting initial NFTs to the NFT contract...");
  for (let i = 0; i < 5; i++) {
    await bearNFT.safeMint(await bearNFT.getAddress());
  }
  console.log("Minted 5 NFTs to the contract");

  // Check the current swap rate
  const currentRate = await bearNFT.getSwapRate();
  console.log(`Current NFT price (swap rate): ${ethers.formatEther(currentRate)} BTB`);

  // Verify contracts
  console.log("\nVerifying contracts on Basescan...");
  
  try {
    console.log("Verifying BTBFinance...");
    await hre.run("verify:verify", {
      address: await btbToken.getAddress(),
      constructorArguments: [deployer.address],
    });
    console.log("BTBFinance verified successfully");
  } catch (error) {
    console.error("Error verifying BTBFinance:", error);
  }

  try {
    console.log("Verifying BearNFTDynamic...");
    await hre.run("verify:verify", {
      address: await bearNFT.getAddress(),
      constructorArguments: [deployer.address],
    });
    console.log("BearNFTDynamic verified successfully");
  } catch (error) {
    console.error("Error verifying BearNFTDynamic:", error);
  }

  try {
    console.log("Verifying BearHunterEcosystem...");
    await hre.run("verify:verify", {
      address: await bearHunterEcosystem.getAddress(),
      constructorArguments: [
        await bearNFT.getAddress(),
        await btbToken.getAddress(),
        deployer.address,
        deployer.address,
        deployer.address
      ],
    });
    console.log("BearHunterEcosystem verified successfully");
  } catch (error) {
    console.error("Error verifying BearHunterEcosystem:", error);
  }
  
  console.log("\nDeployment complete!");
  console.log("BTB Token:", await btbToken.getAddress());
  console.log("Dynamic Bear NFT:", await bearNFT.getAddress());
  console.log("Game Ecosystem:", await bearHunterEcosystem.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
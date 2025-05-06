const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy BTBFinance token first
  const BTBFinance = await ethers.getContractFactory("BTBFinance");
  const btbToken = await BTBFinance.deploy(deployer.address);
  await btbToken.waitForDeployment();
  console.log("BTBFinance deployed to:", await btbToken.getAddress());

  // Deploy BearNFT
  const BearNFT = await ethers.getContractFactory("BearNFT");
  const bearNFT = await BearNFT.deploy(deployer.address);
  await bearNFT.waitForDeployment();
  console.log("BearNFT deployed to:", await bearNFT.getAddress());

  // Set payment token in BearNFT to use BTB
  const tokenPrice = ethers.parseEther("100"); // 100 BTB per NFT
  await bearNFT.setPaymentToken(await btbToken.getAddress(), tokenPrice);
  console.log("Set BTB as payment token for BearNFT with price:", ethers.formatEther(tokenPrice), "BTB");

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
    console.log("Verifying BearNFT...");
    await hre.run("verify:verify", {
      address: await bearNFT.getAddress(),
      constructorArguments: [deployer.address],
    });
    console.log("BearNFT verified successfully");
  } catch (error) {
    console.error("Error verifying BearNFT:", error);
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
  console.log("Bear NFT:", await bearNFT.getAddress());
  console.log("Game Ecosystem:", await bearHunterEcosystem.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
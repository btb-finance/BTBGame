const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // If you want to use existing contracts instead of deploying new ones,
  // uncomment and set these variables:
  /*
  const btbAddress = "0x50a1C79913c3D1C81C83B00932ec98B1c6F0dbD4";
  const nftAddress = "0xf67F5CF750828005b092e3D69551629BE25b299f";
  const mimoAddress = "0xe305231706961a10fa5a74cb173a701366048805";
  console.log("Using existing contracts:");
  console.log("BTB Token:", btbAddress);
  console.log("Bear NFT:", nftAddress);
  console.log("MiMo Token:", mimoAddress);
  */

  // Deploy BTBFinance token
  console.log("Deploying BTBFinance token...");
  const BTBFinance = await ethers.getContractFactory("BTBFinance");
  const btbToken = await BTBFinance.deploy(deployer.address);
  await btbToken.waitForDeployment();
  const btbAddress = await btbToken.getAddress();
  console.log("BTBFinance deployed to:", btbAddress);

  // Deploy BearNFT
  console.log("Deploying BearNFT...");
  const BearNFT = await ethers.getContractFactory("BearNFT");
  const bearNFT = await BearNFT.deploy(deployer.address);
  await bearNFT.waitForDeployment();
  const nftAddress = await bearNFT.getAddress();
  console.log("BearNFT deployed to:", nftAddress);

  // Set payment token in BearNFT to use BTB
  const tokenPrice = ethers.parseEther("100"); // 100 BTB per NFT
  await bearNFT.setPaymentToken(btbAddress, tokenPrice);
  console.log("Set BTB as payment token for BearNFT with price:", ethers.formatEther(tokenPrice), "BTB");

  // Deploy MiMoGaMe token
  console.log("Deploying MiMoGaMe token...");
  const MiMoGaMe = await ethers.getContractFactory("MiMoGaMe");
  const mimoToken = await MiMoGaMe.deploy(deployer.address, deployer.address);
  await mimoToken.waitForDeployment();
  const mimoAddress = await mimoToken.getAddress();
  console.log("MiMoGaMe token deployed to:", mimoAddress);

  console.log("\nAll preparatory contracts deployed successfully:");
  console.log("BTB Token:", btbAddress);
  console.log("Bear NFT:", nftAddress);
  console.log("MiMo Token:", mimoAddress);
  
  // Now deploy the main ecosystem contract
  console.log("\nDeploying BearHunterEcosystem (this might fail due to size constraints)...");
  try {
    const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
    const bearHunterEcosystem = await BearHunterEcosystem.deploy(
      nftAddress,               // _bearNFT
      btbAddress,               // _btbToken
      mimoAddress,              // _mimoToken
      deployer.address,         // _liquidityReceiver
      deployer.address,         // _feeReceiver
      deployer.address          // initialOwner
    );
    await bearHunterEcosystem.waitForDeployment();
    const ecosystemAddress = await bearHunterEcosystem.getAddress();
    console.log("BearHunterEcosystem deployed to:", ecosystemAddress);
    
    // Set game contract address in MiMoGaMe token
    await mimoToken.setGameContractAddress(ecosystemAddress);
    console.log("Set BearHunterEcosystem as the game contract in MiMoGaMe token");
    
    // Verify ecosystem contract
    try {
      console.log("Verifying BearHunterEcosystem...");
      await hre.run("verify:verify", {
        address: ecosystemAddress,
        constructorArguments: [
          nftAddress,
          btbAddress,
          mimoAddress,
          deployer.address,
          deployer.address,
          deployer.address
        ],
      });
      console.log("BearHunterEcosystem verified successfully");
    } catch (error) {
      console.error("Error verifying BearHunterEcosystem:", error);
    }
    
  } catch (error) {
    console.error("Error deploying BearHunterEcosystem:", error);
    console.log("Contract may be too large for the chain. Consider splitting it into multiple contracts.");
  }
  
  // Verify the support contracts
  console.log("\nVerifying supporting contracts on Basescan...");
  
  try {
    console.log("Verifying BTBFinance...");
    await hre.run("verify:verify", {
      address: btbAddress,
      constructorArguments: [deployer.address],
    });
    console.log("BTBFinance verified successfully");
  } catch (error) {
    console.error("Error verifying BTBFinance:", error);
  }

  try {
    console.log("Verifying BearNFT...");
    await hre.run("verify:verify", {
      address: nftAddress,
      constructorArguments: [deployer.address],
    });
    console.log("BearNFT verified successfully");
  } catch (error) {
    console.error("Error verifying BearNFT:", error);
  }

  try {
    console.log("Verifying MiMoGaMe token...");
    await hre.run("verify:verify", {
      address: mimoAddress,
      constructorArguments: [deployer.address, deployer.address],
    });
    console.log("MiMoGaMe token verified successfully");
  } catch (error) {
    console.error("Error verifying MiMoGaMe token:", error);
  }
  
  console.log("\nDeployment complete!");
  console.log("BTB Token:", btbAddress);
  console.log("Bear NFT:", nftAddress);
  console.log("MiMo Token:", mimoAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying BearHunterEcosystem with the account:", deployer.address);
  
  // Use the existing contracts we deployed earlier
  const btbAddress = "0xEAe31903f3BFFb663ae7c713dDF99e3a8A912a32";
  const nftAddress = "0x6508D0A82FbCb65b89022FBf66383A2a57e0f191";
  const mimoAddress = "0x9dBAe1a1b61bA2A61B2c45699989a275241557F4";
  
  console.log("Using existing contracts:");
  console.log("BTB Token:", btbAddress);
  console.log("Bear NFT:", nftAddress);
  console.log("MiMo Token:", mimoAddress);
  
  // Get the MiMoGaMe contract
  const mimoToken = await ethers.getContractAt("MiMoGaMe", mimoAddress);
  
  // Now deploy just the BearHunterEcosystem contract
  console.log("\nDeploying BearHunterEcosystem...");
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
    
    console.log("Waiting for deployment to complete (this may take a while)...");
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
    
    console.log("\nDeployment complete!");
    console.log("Game Ecosystem:", ecosystemAddress);
    
  } catch (error) {
    console.error("Error deploying BearHunterEcosystem:", error);
    
    if (error.message.includes("max code size exceeded")) {
      console.log("\nContract is too large for deployment on this network.");
      console.log("Consider splitting the contract into multiple smaller contracts or using libraries.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
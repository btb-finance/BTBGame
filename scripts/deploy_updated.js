const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying updated contracts with the account:", deployer.address);

  // Use existing BTB and NFT contracts
  const btbAddress = "0x1294Db85d38Eab9Ca793145ce94B57277E4BD909";
  const nftAddress = "0xc0c5D364893c620eaA1F37C939F17AE712D94c27";
  
  console.log("Using existing contracts:");
  console.log("BTB Token:", btbAddress);
  console.log("Bear NFT:", nftAddress);

  // Deploy updated BearHunterEcosystem
  const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
  const bearHunterEcosystem = await BearHunterEcosystem.deploy(
    nftAddress,               // _bearNFT
    btbAddress,               // _btbToken
    deployer.address,         // _liquidityReceiver
    deployer.address,         // _feeReceiver
    deployer.address          // initialOwner
  );
  await bearHunterEcosystem.waitForDeployment();
  console.log("Updated BearHunterEcosystem deployed to:", await bearHunterEcosystem.getAddress());

  // Verify updated contract
  console.log("\nVerifying contract on Basescan...");
  
  try {
    console.log("Verifying BearHunterEcosystem...");
    await hre.run("verify:verify", {
      address: await bearHunterEcosystem.getAddress(),
      constructorArguments: [
        nftAddress,
        btbAddress,
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
  console.log("Updated Game Ecosystem:", await bearHunterEcosystem.getAddress());
  
  // Test the address protection functionality
  console.log("\nTesting address protection functionality...");
  
  // Example address to protect (replace with an actual address you want to test)
  const testAddress = "0x0000000000000000000000000000000000000001";
  
  // Protect the test address
  await bearHunterEcosystem.setAddressProtection(testAddress, true);
  console.log(`Address ${testAddress} protected`);
  
  // Verify the address is protected
  const isProtected = await bearHunterEcosystem.isAddressProtected(testAddress);
  console.log(`Is address protected: ${isProtected}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
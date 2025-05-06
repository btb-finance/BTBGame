const hre = require("hardhat");

// This script checks if an address is protected
async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Using account:", owner.address);

  // Address of the updated game ecosystem contract
  const gameAddress = "0xA44906a6c5A0fC974a73C76F6E8B8a5C066413B7";
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  
  console.log("Connected to Game Ecosystem at:", gameAddress);

  // The address to check
  const addressToCheck = "0x0000000000000000000000000000000000000001"; // Replace with your address
  
  // Check if the address is protected
  const isProtected = await gameEcosystem.protectedAddresses(addressToCheck);
  console.log(`Address ${addressToCheck} is ${isProtected ? 'protected from hunting' : 'not protected'}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
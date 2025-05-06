const hre = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Using account:", owner.address);

  // Address of the updated game ecosystem contract
  const gameAddress = "0xC0D3F135D6417f0E6084E74dD24Acd1ca7DB6d4E";
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  
  console.log("Connected to Game Ecosystem at:", gameAddress);

  // Command line arguments
  const command = process.argv[2]; // 'protect', 'unprotect', 'check', or 'list'
  const address = process.argv[3]; // Address to manage (not needed for 'list')
  
  if (!command) {
    console.log("Usage: npx hardhat run scripts/manage_protection.js --network baseSepolia <command> [address]");
    console.log("Commands:");
    console.log("  protect <address> - Protect an address from being hunted");
    console.log("  unprotect <address> - Remove protection from an address");
    console.log("  check <address> - Check if an address is protected");
    console.log("  batch-protect <address1,address2,...> - Protect multiple addresses at once");
    console.log("  batch-unprotect <address1,address2,...> - Remove protection from multiple addresses");
    return;
  }

  if (command === 'protect' && address) {
    // Protect an address
    console.log(`Protecting ${address} from hunting...`);
    await gameEcosystem.setAddressProtection(address, true);
    console.log(`Address ${address} has been protected.`);
    
    // Verify
    const isProtected = await gameEcosystem.protectedAddresses(address);
    console.log(`Verification: Address is protected: ${isProtected}`);
  }
  else if (command === 'unprotect' && address) {
    // Remove protection from an address
    console.log(`Removing protection from ${address}...`);
    await gameEcosystem.setAddressProtection(address, false);
    console.log(`Protection removed from address ${address}.`);
    
    // Verify
    const isProtected = await gameEcosystem.protectedAddresses(address);
    console.log(`Verification: Address is protected: ${isProtected}`);
  }
  else if (command === 'check' && address) {
    // Check if an address is protected
    const isProtected = await gameEcosystem.protectedAddresses(address);
    console.log(`Address ${address} is ${isProtected ? 'protected from hunting' : 'not protected'}.`);
  }
  else if (command === 'batch-protect' && address) {
    // Protect multiple addresses
    const addresses = address.split(',');
    console.log(`Protecting ${addresses.length} addresses from hunting...`);
    await gameEcosystem.batchSetAddressProtection(addresses, true);
    console.log(`Addresses have been protected.`);
    
    // Verify a sample address
    if (addresses.length > 0) {
      const sampleAddress = addresses[0];
      const isProtected = await gameEcosystem.protectedAddresses(sampleAddress);
      console.log(`Verification: Sample address ${sampleAddress} is protected: ${isProtected}`);
    }
  }
  else if (command === 'batch-unprotect' && address) {
    // Remove protection from multiple addresses
    const addresses = address.split(',');
    console.log(`Removing protection from ${addresses.length} addresses...`);
    await gameEcosystem.batchSetAddressProtection(addresses, false);
    console.log(`Protection removed from addresses.`);
    
    // Verify a sample address
    if (addresses.length > 0) {
      const sampleAddress = addresses[0];
      const isProtected = await gameEcosystem.protectedAddresses(sampleAddress);
      console.log(`Verification: Sample address ${sampleAddress} is protected: ${isProtected}`);
    }
  }
  else {
    console.log("Invalid command or missing address.");
    console.log("Usage: npx hardhat run scripts/manage_protection.js --network baseSepolia <command> [address]");
    console.log("Commands: protect, unprotect, check, batch-protect, batch-unprotect");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
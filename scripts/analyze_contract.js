const hre = require("hardhat");

async function main() {
  const ECOSYSTEM_ADDRESS = "0x0a5124EAC1497Bce01Bb2653030394e081cA4709";
  
  try {
    // Get the contract instance
    const contract = await ethers.getContractAt("BearHunterEcosystem", ECOSYSTEM_ADDRESS);
    
    // Try to get the ABI for the contract
    const contractInterface = contract.interface;
    
    // Check all available functions
    console.log("\n===== CONTRACT FUNCTIONS =====");
    console.log("Function signatures in the ABI:");
    
    Object.keys(contractInterface.functions).forEach(func => {
      console.log(`- ${func}`);
    });
    
    // Check for typical pause-related functions
    const possiblePauseFunctions = [
      'pause()', 
      'unpause()', 
      'paused()', 
      'setPaused(bool)', 
      'setDepositPaused(bool)', 
      'setRedemptionPaused(bool)', 
      'setGamePaused(bool)'
    ];
    
    console.log("\n===== CHECKING FOR SPECIFIC PAUSE FUNCTIONS =====");
    for (const func of possiblePauseFunctions) {
      try {
        if (contractInterface.functions[func]) {
          console.log(`✅ Function '${func}' exists in the contract.`);
        } else {
          console.log(`❌ Function '${func}' not found in the ABI.`);
        }
      } catch (e) {
        console.log(`Error checking function '${func}': ${e.message}`);
      }
    }
    
    // Try to check the current state
    console.log("\n===== CHECKING CURRENT STATE =====");
    
    try {
      const isPaused = await contract.paused();
      console.log(`Contract is ${isPaused ? "PAUSED" : "NOT PAUSED"}`);
    } catch (e) {
      console.log(`Error checking paused state: ${e.message}`);
    }
    
    try {
      const isDepositPaused = await contract.depositPaused();
      console.log(`Deposit is ${isDepositPaused ? "PAUSED" : "NOT PAUSED"}`);
    } catch (e) {
      console.log(`Error checking deposit paused state: ${e.message}`);
    }
    
    try {
      const isRedemptionPaused = await contract.redemptionPaused();
      console.log(`Redemption is ${isRedemptionPaused ? "PAUSED" : "NOT PAUSED"}`);
    } catch (e) {
      console.log(`Error checking redemption paused state: ${e.message}`);
    }
    
    console.log("\nAnalysis complete!");
    
  } catch (error) {
    console.error("Error analyzing contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const hre = require("hardhat");

async function main() {
  const [sender] = await ethers.getSigners();
  console.log("Sending MiMo tokens from:", sender.address);

  // Game ecosystem contract address
  const gameAddress = "0xA44906a6c5A0fC974a73C76F6E8B8a5C066413B7";
  
  // Get contract instance
  const gameEcosystem = await ethers.getContractAt("BearHunterEcosystem", gameAddress);
  
  // The recipient address
  const recipientAddress = "0x0000000000000000000000000000000000000001"; // Change this to the recipient's address
  
  // Amount to send (in MiMo tokens)
  const amountToSend = ethers.parseEther("1000"); // 1000 MiMo tokens
  
  // Check sender's balance
  const senderBalance = await gameEcosystem.mimoBalanceOf(sender.address);
  console.log(`Your MiMo balance: ${ethers.formatEther(senderBalance)} MiMo`);
  
  if (senderBalance < amountToSend) {
    console.error("Insufficient MiMo balance!");
    return;
  }
  
  // Send MiMo tokens
  console.log(`Sending ${ethers.formatEther(amountToSend)} MiMo to ${recipientAddress}...`);
  
  try {
    const tx = await gameEcosystem.mimoTransfer(recipientAddress, amountToSend);
    await tx.wait();
    console.log("Transfer successful!");
    
    // Check new balances
    const newSenderBalance = await gameEcosystem.mimoBalanceOf(sender.address);
    const recipientBalance = await gameEcosystem.mimoBalanceOf(recipientAddress);
    
    console.log(`Your new MiMo balance: ${ethers.formatEther(newSenderBalance)} MiMo`);
    console.log(`Recipient's MiMo balance: ${ethers.formatEther(recipientBalance)} MiMo`);
  } catch (error) {
    console.error("Failed to transfer MiMo tokens:", error.message);
    
    // Check if recipient is protected
    try {
      const isProtected = await gameEcosystem.protectedAddresses(recipientAddress);
      if (isProtected) {
        console.log(`The recipient address (${recipientAddress}) is protected from hunting.`);
      }
    } catch (err) {
      // Ignore error checking protection status
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
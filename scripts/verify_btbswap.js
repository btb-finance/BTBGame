const hre = require("hardhat");

async function main() {
  const ecosystemAddress = "0x15bd3E6b03e09187cbB36908Ab4E67FfEaEce120"; // BearHunterEcosystem address
  const deployerAddress = "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b";   // Used as initialOwner and feeReceiver for BTBSwapLogic
  const bearNFTAddress = "0x3F61fC9118B88F9A472B558Bbd34824eA70F281E";    // BearNFT address
  const btbTokenAddress = "0x0a960ba59130aa65dBF2542a05Ed5dD268e9C860";   // BTBFinance address

  console.log(`Attempting to verify BTBSwapLogic deployed by BearHunterEcosystem at ${ecosystemAddress}`);

  try {
    const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
    const ecosystemContract = await BearHunterEcosystem.attach(ecosystemAddress);

    const btbSwapLogicAddress = await ecosystemContract.btbSwapContract();
    console.log(`Found BTBSwapLogic contract at: ${btbSwapLogicAddress}`);

    if (btbSwapLogicAddress === hre.ethers.ZeroAddress) {
        console.error("BTBSwapLogic address is the zero address. Make sure BearHunterEcosystem is deployed and has set the address correctly.");
        return;
    }

    console.log("Verifying BTBSwapLogic...");
    await hre.run("verify:verify", {
      address: btbSwapLogicAddress,
      constructorArguments: [
        deployerAddress,  // initialOwner for BTBSwapLogic
        bearNFTAddress,   // _bearNFTAddress for BTBSwapLogic
        btbTokenAddress,  // _btbTokenAddress for BTBSwapLogic
        deployerAddress   // _feeReceiverAddress for BTBSwapLogic
      ],
      // contract: "contracts/BTBSwapLogic.sol:BTBSwapLogic" // Optional: specify if filename/contract name differs or is ambiguous
    });
    console.log(`BTBSwapLogic at ${btbSwapLogicAddress} verification attempt submitted.`);

  } catch (error) {
    console.error("Error during verification script:", error);
    if (error.message.toLowerCase().includes("already verified")) {
        console.log("Contract might already be verified.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
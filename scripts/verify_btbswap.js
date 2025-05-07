const hre = require("hardhat");

async function main() {
  const ecosystemAddress = "0xd285787625F37F7d6a7EC800812Fb04b6B45e95e"; // BearHunterEcosystem address from recent deployment
  const deployerAddress = "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b";   // Used as initialOwner and feeReceiver for BTBSwapLogic
  const bearNFTAddress = "0x5465Bbc6B28A06714192150DdEa31e796803485a";    // BearNFT address from recent deployment
  const btbTokenAddress = "0x38A02106BB8531d8Ab96fa006EaE9Ec0718548Cd";   // BTBFinance address from recent deployment

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
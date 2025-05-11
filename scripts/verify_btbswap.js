const hre = require("hardhat");

async function main() {
  const ecosystemAddress = "0x4C3E92f8d66C76dEf2dbA15f3F21fACFfDe55cB8"; // BearHunterEcosystem address from recent deployment
  const deployerAddress = "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b";   // Used as initialOwner and feeReceiver for BTBSwapLogic
  const bearNFTAddress = "0xd8Cb4AD6d847A0eD5FC6D2BFADb2242DF524095E";    // BearNFT address from recent deployment
  const btbTokenAddress = "0x1329333db21807c56eD647D1423e2841b2f7B7F8";   // BTBFinance address from recent deployment

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
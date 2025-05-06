/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: ["0x89266ff69e24130a10d24dfb80316a2c6f3e2304345e8796aa820a3a19f27589"],
      chainId: 84532,
    }
  },
  etherscan: {
    apiKey: {
      baseSepolia: "9XI8M8BCN6M6UISZWA68BKTJIKHUWAXNS3"
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};
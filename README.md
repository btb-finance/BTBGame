# Bear Hunter Game Ecosystem v0.9.2

A blockchain-based game ecosystem with NFTs, tokens, and hunting mechanics featuring Hunter NFT burning, premium purchases, and complete economic balance.

## 🚀 Deployed Contracts on Base Mainnet

### 🎮 **Game Version: 0.9.2** - **PRODUCTION READY**

- **BTB Token (Existing):** [0x888e85C95c84CA41eEf3E4C8C89e8dcE03e41488](https://basescan.org/address/0x888e85C95c84CA41eEf3E4C8C89e8dcE03e41488)
- **BEAR NFT (Existing):** [0x000081733751860A8E5BA00FdCF7000b53E90dDD](https://basescan.org/address/0x000081733751860A8E5BA00FdCF7000b53E90dDD)
- **MiMo Token:** [0x4060244A1B59A6395747c3b6f322dF4c1F04e5f6](https://basescan.org/address/0x4060244A1B59A6395747c3b6f322dF4c1F04e5f6)
- **BearHunterEcosystem:** [0x25bB56840715242C1E140d4125F0cc283B1Df717](https://basescan.org/address/0x25bB56840715242C1E140d4125F0cc283B1Df717)
- **BTBSwapLogic:** [0x84dddA499a92754863CAC64dA83D21b892fB2b37](https://basescan.org/address/0x84dddA499a92754863CAC64dA83D21b892fB2b37)

### 📊 **Contract Ownership Structure:**
- **BearHunterEcosystem Owner:** `0x518874E24A19734dF1ef96c0d7398067aF36fF5e`
- **MiMo Token Owner:** `0x25bB56840715242C1E140d4125F0cc283B1Df717` (BearHunterEcosystem)
- **BTBSwapLogic Owner:** `0x25bB56840715242C1E140d4125F0cc283B1Df717` (BearHunterEcosystem)

## 🎯 Game Overview

The Bear Hunter ecosystem consists of five main components:

1. **BTB Token** - The main token for transactions and premium purchases
2. **BEAR NFT** - NFTs that can be purchased and deposited into the game
3. **MiMo Token** - Game currency earned through deposits and used for redemptions
4. **BearHunterEcosystem** - Core game mechanics and Hunter NFT management
5. **BTBSwapLogic** - Advanced swap functionality with premium purchase options

### 🔥 **Key Features v0.9.2:**
- ✅ **Hunter NFT Burning**: Proper NFT destruction during redemption (no infinite generation)
- ✅ **Economic Balance**: 1:1 ratio maintained (1 BEAR deposit = 1 Hunter + 1M MiMo, 1 BEAR redemption = 1 Hunter burned + 1M MiMo)
- ✅ **Premium Purchases**: 5000 BTB premium for enhanced NFT acquisition
- ✅ **Beneficiary Deposits**: Deposit BEAR NFTs on behalf of other addresses
- ✅ **Multiple NFT Operations**: Bulk deposit and redemption support
- ✅ **Version Tracking**: `getGameVersion()` function returns "0.9.2"

## 🕹️ How to Play

### 1. 💰 Buy Bear NFTs (Base Mainnet)

Purchase Bear NFTs with BTB tokens:
```bash
npx hardhat run scripts/buy_nft.js --network base
```

### 2. 🎮 Deposit Bears to Get Hunters

Deposit your Bear NFT to receive a Hunter NFT and MiMo tokens:
```bash
# Standard deposit (for yourself)
npx hardhat run scripts/deposit_bear.js --network base

# Beneficiary deposit (for someone else)
npx hardhat run scripts/deposit_bear_beneficiary.js --network base
```

**Deposit Rewards:**
- 🎯 **1 Hunter NFT** per BEAR NFT deposited
- 💰 **1,000,000 MiMo tokens** per BEAR NFT deposited

### 3. 🔄 Redeem Bears (Hunter Burning)

Redeem BEAR NFTs by burning Hunter NFTs:
```bash
npx hardhat run scripts/redeem_bears.js --network base
```

**Redemption Cost:**
- 💰 **1,000,000 MiMo tokens** per BEAR NFT
- 🔥 **1 Hunter NFT burned** (destroyed permanently) per BEAR NFT

### 4. 💎 Premium Purchases

Purchase NFTs with premium BTB payment:
```bash
npx hardhat run scripts/premium_purchase.js --network base
```

**Premium Purchase Cost:**
- 💰 **Base swap rate** + **5000 BTB tokens**
- 🎯 Premium provides additional value to the ecosystem

### 5. 🍖 Feed Your Hunter

Feed your Hunter regularly to maintain and increase its power:
```bash
npx hardhat run scripts/feed_hunter.js --network base
```

### 6. 🏹 Hunt for MiMo Tokens

Use your Hunter to hunt for MiMo tokens:
```bash
npx hardhat run scripts/hunt.js --network base
```

## 🔧 Development & Testing

### Base Sepolia Testnet
For testing and development, use Base Sepolia:
```bash
npx hardhat run scripts/deploy_fresh_sepolia.js --network baseSepolia
```

## 🛡️ Address Protection Management

As the contract owner, you can protect specific addresses (like liquidity pools) from being hunted:

### Protect an Address
```bash
npx hardhat run scripts/protect_address.js --network base
```

### Unprotect an Address
```bash
npx hardhat run scripts/unprotect_address.js --network base
```

### Check if an Address is Protected
```bash
npx hardhat run scripts/check_protection.js --network base
```

## 📊 Viewing Contract Information

Check current contract information and configuration:
```bash
npx hardhat run scripts/interact.js --network base
```

Check game version:
```bash
# Returns "0.9.2"
await ecosystem.getGameVersion();
await mimoToken.getGameVersion();
await btbSwapLogic.getGameVersion();
```

## ⚙️ Key Game Mechanics

### 🎯 **Hunter NFT System:**
1. **Hunter Power**: Determines how many MiMo tokens you can hunt
2. **Feeding**: Increases Hunter power by 2% if fed daily
3. **Hibernation**: Hunters enter hibernation if they miss 7 consecutive feedings
4. **Hunting Cooldown**: Hunters can only hunt once every 24 hours
5. **Lifespan**: Hunters have a 365-day lifespan
6. **Burning**: Hunters are permanently destroyed during redemption

### 💰 **Economic Model:**
- **Deposit**: 1 BEAR → 1 Hunter + 1M MiMo
- **Redemption**: 1M MiMo + 1 Hunter (burned) → 1 BEAR
- **Premium Purchase**: Base Rate + 5000 BTB → Enhanced acquisition
- **No Infinite Generation**: Economic exploit prevented through Hunter burning

### 🔒 **Security Features:**
- **Address Protection**: LP pools and critical addresses protected from hunting
- **Reentrancy Protection**: All critical functions protected
- **Ownership Control**: Proper access control for administrative functions
- **Hunter Validation**: Ownership verification before operations

## 📋 Contract Configuration

### Current Settings:
- **Hunter reward distribution**: 50% to owner, 25% burned, 25% to liquidity
- **Swap fee**: 1%
- **Admin fee share**: 50%
- **Buy premium**: 5000 BTB tokens
- **Recovery period**: 7 days
- **Hunter lifespan**: 365 days
- **Base redemption cost**: 1,000,000 MiMo tokens

### 🔗 **Network Information:**
- **Network**: Base Mainnet (Chain ID: 8453)
- **RPC**: https://mainnet.base.org
- **Explorer**: https://basescan.org
- **Game Version**: 0.9.2

## 🚀 Deployment Commands

### Base Mainnet Deployment:
```bash
npx hardhat run scripts/deploy_mainnet.js --network base
```

### Contract Verification:
```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Ownership Management:
```bash
# Transfer BTBSwapLogic ownership to ecosystem
npx hardhat run scripts/transfer_btbswap_ownership.js --network base

# Set buy premium
npx hardhat run scripts/set_buy_premium.js --network base
```

## 🔍 Contract Verification Status

All contracts are **VERIFIED** on BaseScan with source code publicly available:
- ✅ MiMo Token: Verified
- ✅ BearHunterEcosystem: Verified  
- ✅ BTBSwapLogic: Verified

## 📁 Important Files

- `/scripts/base-mainnet-addresses.js` - Contract addresses for frontend integration
- `/scripts/verify-mainnet.sh` - Contract verification script
- `/scripts/deploy_mainnet.js` - Base mainnet deployment script
- `/contracts/game.sol` - Main BearHunterEcosystem contract
- `/contracts/MiMoToken.sol` - Game currency token
- `/contracts/BTBSwapLogic.sol` - Swap logic with premium features

---

**🎮 Bear Hunter Game Ecosystem v0.9.2 - Live on Base Mainnet!**

*Featuring complete economic balance, Hunter NFT burning, and premium purchase functionality.*
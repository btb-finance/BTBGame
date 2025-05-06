# Bear Hunter Game Ecosystem

A blockchain-based game ecosystem with NFTs, tokens, and hunting mechanics.

## Deployed Contracts on Base Sepolia

- **BTB Token:** [0xDe5f2d9d57F341a90fdd7ecADC6e28110A87B94E](https://sepolia.basescan.org/address/0xDe5f2d9d57F341a90fdd7ecADC6e28110A87B94E)
- **Bear NFT:** [0x4AF11c8ea29039b9F169DBB08Bf6B794EB45BB7a](https://sepolia.basescan.org/address/0x4AF11c8ea29039b9F169DBB08Bf6B794EB45BB7a)
- **Game Ecosystem:** [0xA44906a6c5A0fC974a73C76F6E8B8a5C066413B7](https://sepolia.basescan.org/address/0xA44906a6c5A0fC974a73C76F6E8B8a5C066413B7)

## Game Overview

The Bear Hunter ecosystem consists of three main components:
1. **BTB Token** - The main token for transactions and purchases
2. **Bear NFT** - NFTs that can be purchased with BTB tokens
3. **Game Ecosystem** - Core game mechanics including:
   - Depositing Bear NFTs to receive Hunter NFTs and MiMo tokens
   - Feeding Hunter NFTs to maintain and increase power
   - Hunting with Hunter NFTs to earn more MiMo tokens
   - Address protection to safeguard certain addresses from being hunted

## How to Play

### 1. Buy Bear NFTs

Purchase Bear NFTs with BTB tokens:
```
npx hardhat run scripts/buy_nft.js --network baseSepolia
```

### 2. Deposit Bears to Get Hunters

Deposit your Bear NFT to receive a Hunter NFT and MiMo tokens:
```
npx hardhat run scripts/deposit_bear.js --network baseSepolia
```

### 3. Feed Your Hunter

Feed your Hunter regularly to maintain and increase its power:
```
npx hardhat run scripts/feed_hunter.js --network baseSepolia
```

### 4. Hunt for MiMo Tokens

Use your Hunter to hunt for MiMo tokens:
```
npx hardhat run scripts/hunt.js --network baseSepolia
```

## Address Protection Management

As the contract owner, you can protect specific addresses (like liquidity pools) from being hunted:

### Protect an Address
```
npx hardhat run scripts/protect_address.js --network baseSepolia
```

### Unprotect an Address
```
npx hardhat run scripts/unprotect_address.js --network baseSepolia
```

### Check if an Address is Protected
```
npx hardhat run scripts/check_protection.js --network baseSepolia
```

## Viewing Contract Information

Check current contract information and configuration:
```
npx hardhat run scripts/interact.js --network baseSepolia
```

## Key Mechanics

1. **Hunter Power**: Determines how many MiMo tokens you can hunt
2. **Feeding**: Increases Hunter power by 2% if fed daily
3. **Hibernation**: Hunters enter hibernation if they miss 7 consecutive feedings
4. **Hunting Cooldown**: Hunters can only hunt once every 24 hours
5. **Lifespan**: Hunters have a 365-day lifespan
6. **Protection**: Some addresses can be protected from being hunted (such as LP pools)

## Contract Information

- Hunter reward distribution: 50% to owner, 25% burned, 25% to liquidity
- Swap fee: 1%
- Admin fee share: 50%
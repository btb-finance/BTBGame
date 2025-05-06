# Game Design Document: BEAR & Hunter Ecosystem

## 1. Overview

A crypto-gaming ecosystem built on the foundation of BTB tokens and BEAR NFTs, expanded with new gameplay mechanics centered around hunting, progression, and token economy.

## 2. Existing Components

- **BTB Tokens**: Native cryptocurrency
- **BEAR NFTs**: Collection with 100,000 total supply
- **BTBSwap Contract**: Exchange mechanism between BTB tokens and BEAR NFTs with algorithmic pricing based on supply

## 3. New Components

### MiMo Token
- **Purpose**: Game utility token for hunting rewards and NFT redemption
- **Initial Distribution**: 1 million tokens per BEAR NFT deposit
- **Tokenomics**:
  - Earned through hunting
  - Burned through redemption
  - Partially sent to liquidity pools
  - Burned when hunted from other wallets

### Hunter NFTs
- **Purpose**: Character NFTs with growing hunting capacity
- **Acquisition**: Received when depositing a BEAR NFT
- **Lifespan**: 1 year (365 days) from creation
- **Core Mechanic**: Hunt MiMo tokens from wallets

### Cave System
- **Function**: Central hub that manages BEAR NFT deposits, MiMo token distribution, and Hunter NFT minting
- **Integration**: Works with BTBSwap to increase BTB backing

## 4. Game Mechanics

### BEAR NFT Deposit
- Player deposits BEAR NFT in the Cave
- NFT is sent to BTBSwap (increasing backing for BTB tokens)
- Player receives 1 million MiMo tokens
- Player receives 1 Hunter NFT

### Hunting Mechanics
- Each Hunter can hunt once per day
- Starting hunt capacity: 10 MiMo per hunt
- Hunt rewards distribution:
  - 50% to Hunter owner
  - 25% burned
  - 25% sent to liquidity pools
- Hunting targets any wallet containing MiMo
- Daily hunt rewards grow with consistent feeding

### Hunter Progression
- **Growth Rate**: ~2% daily power increase with proper feeding
- **Daily Rewards Growth**:
  - Day 1: 10 MiMo
  - Day 30: ~17 MiMo
  - Day 90: ~53 MiMo
  - Day 180: ~277 MiMo
  - Day 270: ~1,459 MiMo
  - Day 365: ~9,003 MiMo
- **Total Hunting Capacity**: ~1,000,000 MiMo over lifetime (365 days)

### Feeding System
- Hunter must be fed after each hunt to maintain/grow power
- Missing feeding results in no power increase for that day
- Multiple missed feedings lead to power reduction
- 7+ consecutive missed feedings causes hibernation

### MiMo Token Redemption
- Player can redeem 1.1 million MiMo tokens for a BEAR NFT
- 1 million MiMo tokens burned
- 100,000 MiMo tokens (10%) sent to liquidity pools
- BEAR NFT is retrieved from BTBSwap

## 5. Economic Model

### Value Creation
- **BEAR NFT**: Value increases as more NFTs enter BTBSwap (increased backing)
- **BTB Token**: Backing increases through circular NFT flow
- **MiMo Token**: Value maintained through burning mechanics
- **Hunter NFT**: Value grows with its hunting capacity

### Circular Economy
```
BEAR NFT → Cave → MiMo + Hunter → Hunting → More MiMo
                                             ↓
                                             ↓
BEAR NFT ← BTBSwap ← Redemption ← More MiMo
```

### Deflationary Mechanisms
- 25% of hunted MiMo burned
- 1 million MiMo burned per BEAR redemption
- Limited Hunter lifespan (365 days)

## 6. Player Engagement Loops

### Daily Loop
- Feed Hunter
- Hunt MiMo tokens
- Watch hunting capacity grow

### Weekly Loop
- Manage Hunter feeding schedule
- Track growth progression
- Plan MiMo token usage

### Monthly/Yearly Loop
- Decide whether to redeem BEAR NFTs
- Manage Hunter lifecycle
- Consider depositing more BEAR NFTs for new Hunters

## 7. Key Benefits

### For Players
- Immediate value from depositing (1M MiMo + Hunter NFT)
- Growing daily rewards from hunting
- Exit mechanism through BEAR NFT redemption
- Multiple strategies for managing assets

### For Ecosystem
- Increased BEAR NFT scarcity in circulation
- Growing BTB token backing
- MiMo token utility and liquidity support
- Continuous engagement through daily/weekly activities

## 8. Implementation Considerations

### Technical Integration
- Cave contract needs permissions to interact with BTBSwap
- All contracts need secure transaction handling
- Hunter power progression needs reliable calculation

### Balance Considerations
- Hunter power growth rate (~2% daily) needs monitoring
- Distribution of hunted MiMo (50/25/25) may need adjustment
- Redemption fee (10%) should be balanced for economy

This comprehensive game design creates a self-sustaining ecosystem with meaningful player engagement, economic sustainability, and long-term value creation.
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BEAR & Hunter Ecosystem Tests", function() {
  let bearNFT;
  let btbToken;
  let mimoToken;
  let ecosystem;
  
  let owner;
  let user1;
  let user2;
  let liquidityReceiver;
  let feeReceiver;
  
  const ONE_MILLION_TOKENS = ethers.parseEther("1000000");
  const FEE_AMOUNT = ethers.parseEther("100000"); // 10% of 1M
  
  beforeEach(async function() {
    [owner, user1, user2, liquidityReceiver, feeReceiver] = await ethers.getSigners();
    
    // Deploy BTB token
    const BTBToken = await ethers.getContractFactory("BTBFinance");
    btbToken = await BTBToken.deploy(owner.address);
    
    // Deploy BEAR NFT
    const BearNFT = await ethers.getContractFactory("BearNFT");
    bearNFT = await BearNFT.deploy(owner.address);
    
    // Deploy MiMo token
    const MiMoToken = await ethers.getContractFactory("MiMoGaMe");
    mimoToken = await MiMoToken.deploy(owner.address, owner.address);
    
    // Deploy BearHunterEcosystem
    const BearHunterEcosystem = await ethers.getContractFactory("BearHunterEcosystem");
    ecosystem = await BearHunterEcosystem.deploy(
      bearNFT.target,
      btbToken.target,
      mimoToken.target,
      liquidityReceiver.address,
      feeReceiver.address,
      owner.address
    );
    
    // Setup permissions
    await mimoToken.transferOwnership(ecosystem.target);
    await ecosystem.initializeMiMoGameContract();
    
    // Transfer BTBSwapLogic ownership to ecosystem contract
    const btbSwapAddress = await ecosystem.btbSwapContract();
    const btbSwapContract = await ethers.getContractAt("BTBSwapLogic", btbSwapAddress);
    await btbSwapContract.transferOwnership(ecosystem.target);
    
    // Mint some BEARs to users
    await bearNFT.safeMint(user1.address);
    await bearNFT.safeMint(user1.address);
    await bearNFT.safeMint(user2.address);
    
    // Connect users to contracts
    bearNFTUser1 = bearNFT.connect(user1);
    bearNFTUser2 = bearNFT.connect(user2);
    ecosystemUser1 = ecosystem.connect(user1);
    ecosystemUser2 = ecosystem.connect(user2);
  });
  
  describe("Deposit BEAR NFT", function() {
    it("Should allow user to deposit BEAR and receive MiMo + Hunter", async function() {
      // Approve BEAR for Ecosystem
      await bearNFTUser1.approve(ecosystem.target, 1);
      
      // Deposit BEAR using new unified function
      await expect(ecosystemUser1.depositBears([1]))
        .to.emit(ecosystem, "BearDeposited")
        .withArgs(user1.address, 1, 1); // First Hunter has ID 1
        
      // Check user received 1M MiMo
      expect(await mimoToken.balanceOf(user1.address)).to.equal(ONE_MILLION_TOKENS);
      
      // Check user received Hunter NFT
      expect(await ecosystem.ownerOf(1)).to.equal(user1.address);
    });
  });
  
  describe("Hunter Mechanics", function() {
    it("Should allow hunter feeding and power increase", async function() {
      // First deposit a BEAR to get a Hunter
      await bearNFTUser1.approve(ecosystem.target, 1);
      await ecosystemUser1.depositBears([1]);
      
      // Get initial hunter power
      const initialStats = await ecosystem.getHunterStats(1);
      const initialPower = initialStats[3];
      
      // Feed the hunter using new unified function
      await network.provider.send("evm_increaseTime", [24 * 60 * 60]); // Jump 24 hours
      await network.provider.send("evm_mine");
      
      await ecosystemUser1.feedHunters([1]);
      
      // Get new power
      const newStats = await ecosystem.getHunterStats(1);
      const newPower = newStats[3];
      
      // Power should increase by 2%
      const expectedPower = initialPower * 102n / 100n;
      expect(newPower).to.equal(expectedPower);
    });
    
    it("Should allow hunting after feeding", async function() {
      // First deposit a BEAR to get a Hunter
      await bearNFTUser1.approve(ecosystem.target, 1);
      await ecosystemUser1.depositBears([1]);
      
      // Feed the hunter
      await network.provider.send("evm_increaseTime", [24 * 60 * 60]); // Jump 24 hours
      await network.provider.send("evm_mine");
      
      await ecosystemUser1.feedHunters([1]);
      
      // Need to give user2 some MiMo to hunt from
      await bearNFTUser2.approve(ecosystem.target, 3);
      await ecosystemUser2.depositBears([3]);
      
      // Hunt using new unified function (hunt from user2)
      await network.provider.send("evm_increaseTime", [24 * 60 * 60]); // Jump 24 hours
      await network.provider.send("evm_mine");
      
      const user2Address = await user2.getAddress();
      await expect(ecosystemUser1.hunt([1], [user2Address]))
        .to.emit(ecosystem, "HunterHunted");
        
      // Check user1 has more balance (received hunting rewards)
      expect(await mimoToken.balanceOf(user1.address)).to.be.greaterThan(ONE_MILLION_TOKENS);
    });
  });
  
  describe("Multiple Operations", function() {
    it("Should allow multiple hunters to be fed at once", async function() {
      // First deposit BEARs to get Hunters
      await bearNFTUser1.approve(ecosystem.target, 1);
      await bearNFTUser1.approve(ecosystem.target, 2);
      await ecosystemUser1.depositBears([1, 2]);
      
      // Feed multiple hunters at once
      await network.provider.send("evm_increaseTime", [24 * 60 * 60]); // Jump 24 hours
      await network.provider.send("evm_mine");
      
      await expect(ecosystemUser1.feedHunters([1, 2]))
        .to.not.be.reverted;
        
      // Check both hunters were fed (power should have increased)
      const stats1 = await ecosystem.getHunterStats(1);
      const stats2 = await ecosystem.getHunterStats(2);
      expect(stats1[3]).to.be.greaterThan(ethers.parseEther("20")); // Base power increased
      expect(stats2[3]).to.be.greaterThan(ethers.parseEther("20")); // Base power increased
    });
  });

  describe("Redemption with Hunter Burning", function() {
    it("Should require Hunter NFT to be burned for redemption", async function() {
      // First deposit a BEAR to get a Hunter and MiMo tokens
      await bearNFTUser1.approve(ecosystem.target, 1);
      await ecosystemUser1.depositBears([1]);
      
      // Check initial balances
      expect(await mimoToken.balanceOf(user1.address)).to.equal(ONE_MILLION_TOKENS);
      expect(await ecosystem.ownerOf(1)).to.equal(user1.address);
      expect(await ecosystem.balanceOf(user1.address)).to.equal(1);
      
      // Try to redeem without providing Hunter NFT (should fail because array length doesn't match)
      await expect(ecosystemUser1.redeemBears(1, []))
        .to.be.revertedWithCustomError(ecosystem, "InvalidAmount");
      
      // Add more MiMo tokens to cover the fee
      await bearNFTUser1.approve(ecosystem.target, 2);
      await ecosystemUser1.depositBears([2]);
      
      // Now user has 2M MiMo tokens and 2 Hunter NFTs
      expect(await mimoToken.balanceOf(user1.address)).to.equal(ONE_MILLION_TOKENS * 2n);
      expect(await ecosystem.balanceOf(user1.address)).to.equal(2);
      
      // Redeem 1 BEAR by providing 1 Hunter NFT to burn
      await expect(ecosystemUser1.redeemBears(1, [1]))
        .to.emit(ecosystem, "HunterBurnedForRedemption")
        .withArgs(user1.address, 1, 1)
        .and.to.emit(ecosystem, "BearRedeemed");
      
      // Check final balances
      const finalMimoBalance = await mimoToken.balanceOf(user1.address);
      const expectedBalance = ONE_MILLION_TOKENS * 2n - (ONE_MILLION_TOKENS + FEE_AMOUNT);
      expect(finalMimoBalance).to.equal(expectedBalance);
      
      // Check Hunter NFT was burned (sent to burn address)
      const burnAddress = "0x000000000000000000000000000000000000dEaD";
      expect(await ecosystem.ownerOf(1)).to.equal(burnAddress);
      expect(await ecosystem.balanceOf(user1.address)).to.equal(1); // Only 1 Hunter left
      
      // Check user received BEAR NFT back
      expect(await bearNFT.ownerOf(1)).to.equal(user1.address);
    });
    
    it("Should fail if user doesn't own the Hunter NFT", async function() {
      // user1 deposits and gets Hunter NFT
      await bearNFTUser1.approve(ecosystem.target, 1);
      await ecosystemUser1.depositBears([1]);
      
      // user2 deposits to get enough MiMo tokens for redemption
      await bearNFTUser2.approve(ecosystem.target, 3);
      await ecosystemUser2.depositBears([3]);
      
      // user2 tries to redeem using user1's Hunter NFT (should fail)
      await expect(ecosystemUser2.redeemBears(1, [1]))
        .to.be.revertedWithCustomError(ecosystem, "NotHunterOwner");
    });
    
    it("Should fail if Hunter NFT array length doesn't match count", async function() {
      // user1 deposits and gets Hunter NFT
      await bearNFTUser1.approve(ecosystem.target, 1);
      await ecosystemUser1.depositBears([1]);
      
      // Try to redeem 1 BEAR but provide 0 Hunter NFTs
      await expect(ecosystemUser1.redeemBears(1, []))
        .to.be.revertedWithCustomError(ecosystem, "InvalidAmount");
      
      // Try to redeem 1 BEAR but provide 2 Hunter NFTs
      await bearNFTUser1.approve(ecosystem.target, 2);
      await ecosystemUser1.depositBears([2]);
      
      await expect(ecosystemUser1.redeemBears(1, [1, 2]))
        .to.be.revertedWithCustomError(ecosystem, "InvalidAmount");
    });
  });
});
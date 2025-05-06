const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BEAR & Hunter Ecosystem Tests", function() {
  let bearNFT;
  let btbToken;
  let mimoToken;
  let btbSwap;
  let hunterNFT;
  let cave;
  
  let owner;
  let user1;
  let user2;
  let feeReceiver;
  
  const ONE_MILLION_TOKENS = ethers.parseEther("1000000");
  const FEE_AMOUNT = ethers.parseEther("100000"); // 10% of 1M
  
  beforeEach(async function() {
    [owner, user1, user2, feeReceiver] = await ethers.getSigners();
    
    // Deploy BTB token
    const BTBToken = await ethers.getContractFactory("BTBFinance");
    btbToken = await BTBToken.deploy(owner.address);
    
    // Deploy BEAR NFT
    const BearNFT = await ethers.getContractFactory("BearNFT");
    bearNFT = await BearNFT.deploy(owner.address);
    
    // Deploy MiMo token
    const MiMoToken = await ethers.getContractFactory("MiMoGame");
    mimoToken = await MiMoToken.deploy(owner.address, owner.address);
    
    // Deploy BTBSwap
    const BTBSwap = await ethers.getContractFactory("BTBSwap");
    btbSwap = await BTBSwap.deploy(btbToken.address, bearNFT.address, owner.address);
    
    // Deploy Hunter NFT
    const HunterNFT = await ethers.getContractFactory("HunterNFT");
    hunterNFT = await HunterNFT.deploy(mimoToken.address, feeReceiver.address, owner.address);
    
    // Deploy Cave
    const Cave = await ethers.getContractFactory("Cave");
    cave = await Cave.deploy(
      bearNFT.address,
      mimoToken.address,
      hunterNFT.address,
      btbSwap.address,
      feeReceiver.address,
      owner.address
    );
    
    // Setup permissions
    await hunterNFT.setCaveContract(cave.address);
    await mimoToken.transferOwnership(cave.address);
    
    // Mint some BEARs to owner and set up BTBSwap
    await bearNFT.batchMint(owner.address, 10);
    await btbToken.transfer(btbSwap.address, ethers.utils.parseUnits("100", 18));
    
    // Approve BEARs to BTBSwap
    for (let i = 1; i <= 5; i++) {
      await bearNFT.approve(btbSwap.address, i);
    }
    
    // Transfer some BEARs to user1
    await bearNFT.transferFrom(owner.address, user1.address, 6);
    await bearNFT.transferFrom(owner.address, user1.address, 7);
    
    // Connect user1 to contracts
    bearNFTUser1 = bearNFT.connect(user1);
    mimoTokenUser1 = mimoToken.connect(user1);
    hunterNFTUser1 = hunterNFT.connect(user1);
    caveUser1 = cave.connect(user1);
  });
  
  describe("Deposit BEAR NFT", function() {
    it("Should allow user to deposit BEAR and receive MiMo + Hunter", async function() {
      // Approve BEAR for Cave
      await bearNFTUser1.approve(cave.address, 6);
      
      // Deposit BEAR
      await expect(caveUser1.depositBear(6))
        .to.emit(cave, "BearDeposited")
        .withArgs(user1.address, 6, 1); // First Hunter has ID 1
        
      // Check user received 1M MiMo
      expect(await mimoToken.balanceOf(user1.address)).to.equal(ONE_MILLION_TOKENS);
      
      // Check user received Hunter NFT
      expect(await hunterNFT.ownerOf(1)).to.equal(user1.address);
      
      // Check BEAR is in BTBSwap
      expect(await bearNFT.ownerOf(6)).to.equal(btbSwap.address);
    });
  });
  
  describe("Hunter Mechanics", function() {
    it("Should allow hunter feeding and power increase", async function() {
      // First deposit a BEAR to get a Hunter
      await bearNFTUser1.approve(cave.address, 6);
      await caveUser1.depositBear(6);
      
      // Get initial hunter power
      const initialStats = await hunterNFT.getHunterStats(1);
      const initialPower = initialStats[3];
      
      // Feed the hunter
      await network.provider.send("evm_increaseTime", [24 * 60 * 60]); // Jump 24 hours
      await network.provider.send("evm_mine");
      
      await hunterNFTUser1.feedHunter(1);
      
      // Get new power
      const newStats = await hunterNFT.getHunterStats(1);
      const newPower = newStats[3];
      
      // Power should increase by 2%
      const expectedPower = initialPower.mul(102).div(100);
      expect(newPower).to.equal(expectedPower);
    });
    
    it("Should allow hunting after feeding", async function() {
      // First deposit a BEAR to get a Hunter
      await bearNFTUser1.approve(cave.address, 6);
      await caveUser1.depositBear(6);
      
      // Feed the hunter
      await network.provider.send("evm_increaseTime", [24 * 60 * 60]); // Jump 24 hours
      await network.provider.send("evm_mine");
      
      await hunterNFTUser1.feedHunter(1);
      
      // Hunt
      await network.provider.send("evm_increaseTime", [24 * 60 * 60]); // Jump 24 hours
      await network.provider.send("evm_mine");
      
      await expect(hunterNFTUser1.hunt(1))
        .to.emit(hunterNFT, "HunterHunted");
        
      // Check user received 50% of hunting rewards
      // Base hunt is 10 MiMo, 50% to owner = 5 MiMo
      // Plus the 1M from deposit = 1,000,005 MiMo
      const expectedBalance = ONE_MILLION_TOKENS + ethers.parseEther("5");
      expect(await mimoToken.balanceOf(user1.address)).to.be.closeTo(
        expectedBalance, 
        ethers.parseEther("0.001") // Allow small rounding error
      );
    });
  });
  
  describe("Direct Swap", function() {
    it("Should allow user to swap MiMo for BEAR directly", async function() {
      // First let user1 get some MiMo tokens
      await mimoToken.mint(user1.address, ONE_MILLION_TOKENS.add(FEE_AMOUNT));
      
      // Approve MiMo to Cave
      await mimoTokenUser1.approve(cave.address, ONE_MILLION_TOKENS.add(FEE_AMOUNT));
      
      // Transfer a BEAR to BTBSwap
      await bearNFT.approve(btbSwap.address, 2);
      await bearNFT.transferFrom(owner.address, btbSwap.address, 2);
      
      // Perform direct swap
      await expect(caveUser1.directSwap())
        .to.emit(cave, "DirectSwap")
        .withArgs(user1.address, ONE_MILLION_TOKENS.add(FEE_AMOUNT), 2);
        
      // Check user received a BEAR
      expect(await bearNFT.ownerOf(2)).to.equal(user1.address);
      
      // Check MiMo was burned and fee transferred
      expect(await mimoToken.balanceOf(user1.address)).to.equal(0);
      expect(await mimoToken.balanceOf(feeReceiver.address)).to.equal(FEE_AMOUNT);
    });
  });
  
  describe("Redeem BEAR", function() {
    it("Should allow user to redeem MiMo for BEAR via BTBSwap", async function() {
      // First let user1 get some MiMo tokens
      await mimoToken.mint(user1.address, ONE_MILLION_TOKENS.add(FEE_AMOUNT));
      
      // Approve MiMo to Cave
      await mimoTokenUser1.approve(cave.address, ONE_MILLION_TOKENS.add(FEE_AMOUNT));
      
      // Transfer a BEAR to BTBSwap
      await bearNFT.approve(btbSwap.address, 3);
      await bearNFT.transferFrom(owner.address, btbSwap.address, 3);
      
      // Perform redemption
      await expect(caveUser1.redeemBear())
        .to.emit(cave, "BearRedeemed")
        .withArgs(user1.address, 3, ONE_MILLION_TOKENS.add(FEE_AMOUNT));
        
      // Check user received a BEAR
      expect(await bearNFT.ownerOf(3)).to.equal(user1.address);
      
      // Check MiMo was burned and fee transferred
      expect(await mimoToken.balanceOf(user1.address)).to.equal(0);
      expect(await mimoToken.balanceOf(feeReceiver.address)).to.equal(FEE_AMOUNT);
    });
  });
});
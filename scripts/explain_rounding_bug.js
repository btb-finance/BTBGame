const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 REWARD DISTRIBUTION ROUNDING BUG EXPLAINED");
    console.log("=" .repeat(60));
    
    console.log("\n💰 Current Distribution: 50% + 25% + 25% = 100%");
    console.log("   ownerRewardPercentage = 5000  (50%)");
    console.log("   burnPercentage = 2500         (25%)");
    console.log("   liquidityPercentage = 2500    (25%)");
    
    console.log("\n🧮 EXAMPLE 1: Hunt Amount = 100 tokens");
    const hunt1 = 100;
    const owner1 = Math.floor(hunt1 * 5000 / 10000);
    const burn1 = Math.floor(hunt1 * 2500 / 10000);
    const liquidity1 = Math.floor(hunt1 * 2500 / 10000);
    const total1 = owner1 + burn1 + liquidity1;
    const dust1 = hunt1 - total1;
    
    console.log(`   Hunt amount: ${hunt1}`);
    console.log(`   Owner gets: (${hunt1} * 5000) / 10000 = ${owner1}`);
    console.log(`   Burn gets:  (${hunt1} * 2500) / 10000 = ${burn1}`);
    console.log(`   Liquidity:  (${hunt1} * 2500) / 10000 = ${liquidity1}`);
    console.log(`   Total distributed: ${total1}`);
    console.log(`   Dust remaining: ${dust1} ✅ (no problem)`);
    
    console.log("\n🧮 EXAMPLE 2: Hunt Amount = 999 tokens");
    const hunt2 = 999;
    const owner2 = Math.floor(hunt2 * 5000 / 10000);
    const burn2 = Math.floor(hunt2 * 2500 / 10000);
    const liquidity2 = Math.floor(hunt2 * 2500 / 10000);
    const total2 = owner2 + burn2 + liquidity2;
    const dust2 = hunt2 - total2;
    
    console.log(`   Hunt amount: ${hunt2}`);
    console.log(`   Owner gets: (${hunt2} * 5000) / 10000 = ${owner2}`);
    console.log(`   Burn gets:  (${hunt2} * 2500) / 10000 = ${burn2}`);
    console.log(`   Liquidity:  (${hunt2} * 2500) / 10000 = ${liquidity2}`);
    console.log(`   Total distributed: ${total2}`);
    console.log(`   Dust remaining: ${dust2} ❌ (PROBLEM!)`);
    
    console.log("\n🧮 EXAMPLE 3: Hunt Amount = 777 tokens");
    const hunt3 = 777;
    const owner3 = Math.floor(hunt3 * 5000 / 10000);
    const burn3 = Math.floor(hunt3 * 2500 / 10000);
    const liquidity3 = Math.floor(hunt3 * 2500 / 10000);
    const total3 = owner3 + burn3 + liquidity3;
    const dust3 = hunt3 - total3;
    
    console.log(`   Hunt amount: ${hunt3}`);
    console.log(`   Owner gets: (${hunt3} * 5000) / 10000 = ${owner3}`);
    console.log(`   Burn gets:  (${hunt3} * 2500) / 10000 = ${burn3}`);
    console.log(`   Liquidity:  (${hunt3} * 2500) / 10000 = ${liquidity3}`);
    console.log(`   Total distributed: ${total3}`);
    console.log(`   Dust remaining: ${dust3} ❌ (PROBLEM!)`);
    
    console.log("\n🚨 THE PROBLEM:");
    console.log("   • Each division truncates (rounds down)");
    console.log("   • Small amounts get 'lost' due to rounding");
    console.log("   • Dust accumulates in the contract over time");
    console.log("   • Eventually thousands of tokens stuck!");
    
    console.log("\n💡 SOLUTION OPTIONS:");
    console.log("");
    console.log("Option 1: Give remainder to owner (most common)");
    console.log("Option 2: Give remainder to liquidity");
    console.log("Option 3: Give remainder to biggest recipient");
    console.log("Option 4: Calculate one amount by subtraction");
    
    console.log("\n✅ RECOMMENDED FIX (Option 4):");
    console.log("1. Calculate owner and burn amounts normally");
    console.log("2. Calculate liquidity = remaining amount");
    console.log("3. This ensures ALL tokens are distributed");
    
    console.log("\n🔧 FIXED CODE PREVIEW:");
    console.log("   uint256 ownerReward = (huntAmount * ownerRewardPercentage) / 10000;");
    console.log("   uint256 burnAmount = (huntAmount * burnPercentage) / 10000;");
    console.log("   uint256 liquidityAmount = huntAmount - ownerReward - burnAmount;");
    console.log("   // Now ALL tokens are guaranteed to be distributed!");
    
    console.log("\n📊 TESTING THE FIX:");
    console.log("");
    
    // Test the fix
    console.log("Hunt amount: 999");
    const fixedOwner = Math.floor(999 * 5000 / 10000);
    const fixedBurn = Math.floor(999 * 2500 / 10000);
    const fixedLiquidity = 999 - fixedOwner - fixedBurn;
    console.log(`   Owner: ${fixedOwner}`);
    console.log(`   Burn: ${fixedBurn}`);
    console.log(`   Liquidity: ${fixedLiquidity} (calculated by subtraction)`);
    console.log(`   Total: ${fixedOwner + fixedBurn + fixedLiquidity} ✅`);
    console.log(`   Dust: ${999 - (fixedOwner + fixedBurn + fixedLiquidity)} ✅`);
    
    console.log("\n🎯 IMPACT:");
    console.log("• ✅ Zero dust accumulation");
    console.log("• ✅ All tokens properly distributed"); 
    console.log("• ✅ Fair to all recipients");
    console.log("• ✅ Contract stays clean");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script failed:", error);
        process.exit(1);
    });
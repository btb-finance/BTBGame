#!/bin/bash
# Verification script for Base Sepolia deployment
# Generated on 2025-07-17T12:07:16.921Z

echo "🔍 Starting contract verification on BaseScan..."

echo "1️⃣ Verifying BTB Token..."
npx hardhat verify --network baseSepolia 0x31EC0585E42f0A4EF268a71EE750C00295a57Bc9 "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b"

echo "2️⃣ Verifying BEAR NFT..."
npx hardhat verify --network baseSepolia 0x7956024deaEcAFF6Da1d5348a1355e8081d3ec53 "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b"

echo "3️⃣ Verifying MiMoGaMe token..."
npx hardhat verify --network baseSepolia 0x46210d9D3a40c1291d8A8058B3775b71790826F9 "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b" "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b"

echo "4️⃣ Verifying BearHunterEcosystem..."
npx hardhat verify --network baseSepolia 0xe2b4720e439100c50645310f869C455242a6CB57 "0x7956024deaEcAFF6Da1d5348a1355e8081d3ec53" "0x31EC0585E42f0A4EF268a71EE750C00295a57Bc9" "0x46210d9D3a40c1291d8A8058B3775b71790826F9" "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b" "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b" "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b"

echo "5️⃣ Verifying BTBSwapLogic..."
npx hardhat verify --network baseSepolia 0xd008A9f89352FCc74a1965Ca63E1D2D93f432BeC "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b" "0x7956024deaEcAFF6Da1d5348a1355e8081d3ec53" "0x31EC0585E42f0A4EF268a71EE750C00295a57Bc9" "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b"

echo "✅ Verification complete!"

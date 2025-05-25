#!/bin/bash
# Verification script for Base Sepolia deployment
# Generated on 2025-05-25T11:39:59.628Z

echo "🔍 Starting contract verification on BaseScan..."

echo "1️⃣ Verifying MiMoGaMe token..."
npx hardhat verify --network baseSepolia 0x37e3d97098cae3AB7A2Ed8791001271f40D90ad5 "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b" "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b"

echo "2️⃣ Verifying BearHunterEcosystem..."
npx hardhat verify --network baseSepolia 0x2fd23D926Ec63eE44c6820Feb7b0252d91a7a4bE "0xd8Cb4AD6d847A0eD5FC6D2BFADb2242DF524095E" "0x1329333db21807c56eD647D1423e2841b2f7B7F8" "0x37e3d97098cae3AB7A2Ed8791001271f40D90ad5" "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b" "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b" "0xbe2680DC1752109b4344DbEB1072fd8Cd880e54b"

echo "✅ Verification complete!"

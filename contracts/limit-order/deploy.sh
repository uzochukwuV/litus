#!/bin/bash

# Limit Order Contract Deployment Script for Stellar Testnet
# This script deploys and initializes the intent-based limit order contract

set -e

echo "🚀 Deploying Limit Order Contract to Testnet..."

# Configuration
NETWORK="testnet"
ORACLE_MAINNET_DEX="CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP"
ORACLE_EXTERNAL_DEX="CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63"
ORACLE_FIAT="CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W"
SOROSWAP_ROUTER="CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS"
AQUA_TOKEN="GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA"
ADMIN="GBASEG66SOECYUGOMNYUXZANKMJGFN6FJDRU47HCNL5UZJP72CE4M2S4"


# Use Stellar Mainnet DEX oracle by default
ORACLE=$ORACLE_MAINNET_DEX

echo "📋 Configuration:"
echo "   Network: $NETWORK"
echo "   Oracle: $ORACLE"
echo "   Soroswap Router: $SOROSWAP_ROUTER"
echo ""

# Check if identity exists
if ! stellar keys ls | grep -q "default"; then
    echo "❌ No default identity found. Creating one..."
    stellar keys generate default --network testnet
fi

ADMIN=$(stellar keys address default)
echo "👤 Admin address: $ADMIN"
echo ""

# Fund admin account from friendbot
echo "💰 Funding admin account from friendbot..."
curl -s "https://friendbot.stellar.org?addr=$ADMIN" > /dev/null
echo "✅ Account funded"
echo ""

# Build contract
echo "🔨 Building contract..."
cd "$(dirname "$0")"
stellar contract build
echo "✅ Contract built"
echo ""

# Deploy contract
echo "📤 Deploying contract..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm /workspaces/codespaces-blank/target/wasm32v1-none/release/limit_order.wasm \
    --source-account default \
    --network testnet \
    -- \
    --admin "$ADMIN" \
    --router "$SOROSWAP_ROUTER" \
    --oracle "$ORACLE")

echo "✅ Contract deployed!"
echo "   Contract ID: $CONTRACT_ID"
echo ""

# Initialize contract
echo "⚙️  Initializing contract..."
echo "   Admin: $ADMIN"
echo "   Router: $SOROSWAP_ROUTER"
echo "   Oracle: $ORACLE"
echo ""

stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source-account default \
    --network testnet \
    -- \
    set_oracle \
    --admin "$ADMIN" \
    --oracle "$ORACLE"

echo "✅ Contract initialized!"
echo ""

# Save contract ID for future use
echo $CONTRACT_ID > contract-id.txt
echo "📝 Contract ID saved to contract-id.txt"
echo ""

# Display summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Contract ID: $CONTRACT_ID"
echo "Admin: $ADMIN"
echo "Oracle: $ORACLE"
echo "Router: $SOROSWAP_ROUTER"
echo "Network: $NETWORK"
echo ""
echo "Next steps:"
echo "1. Test with: ./test.sh"
echo "2. View on Stellar Expert: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo ""

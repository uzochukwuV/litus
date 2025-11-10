# Adding Multiple Assets to Limit Order Contract

## Understanding Reflector Oracle Asset Types

Reflector Oracle supports two types of assets:

### 1. **Stellar Assets** - `Asset::Stellar(Address)`

Use this for any Soroban token contract on Stellar (testnet or mainnet).

**Example:**

```rust
use crate::oracle::stellar_asset;

// XLM token
let xlm = stellar_asset(Address::from_string(&env, "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"));

// USDC token
let usdc = stellar_asset(Address::from_string(&env, "CBBHRKEP5M3NUDRISGLJKGHDHX3DA2CN2AZBQY6WLVUJ7VNLGSKBDUCM"));
```

### 2. **External Assets** - `Asset::Other(Symbol)`

Use this for assets not on Stellar blockchain (BTC, ETH, fiat currencies, etc.)

**Example:**

```rust
use crate::oracle::symbol_asset;

// Bitcoin price
let btc = symbol_asset(Symbol::new(&env, "BTC"));

// Ethereum price
let eth = symbol_asset(Symbol::new(&env, "ETH"));

// USD fiat
let usd = symbol_asset(Symbol::new(&env, "USD"));
```

## How to Find Token Contract Addresses

### Method 1: Stellar Expert

1. **Testnet**: https://stellar.expert/explorer/testnet
2. **Mainnet**: https://stellar.expert/explorer/public
3. Search for the token by its asset code or issuer
4. Copy the contract address

### Method 2: Stellar CLI

```bash
# Convert Classic asset to Soroban contract address
stellar contract id asset --asset CODE:ISSUER_ADDRESS

# Example: Get USDC contract address
stellar contract id asset --asset USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
```

### Method 3: From Asset Issuer

If you know the Classic Stellar asset:

- Asset Code: `USDC`
- Issuer: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`

The Soroban contract is deterministically derived from this.

## Adding Tokens to Your Contract

### Frontend Integration

Edit `src/contracts/limit_order.ts`:

```typescript
export const TESTNET_TOKENS = {
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  USDC: "CBBHRKEP5M3NUDRISGLJKGHDHX3DA2CN2AZBQY6WLVUJ7VNLGSKBDUCM",
  AQUA: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",

  // Add your custom token here
  EURC: "YOUR_EURC_CONTRACT_ADDRESS_HERE",
  BTC_WRAPPED: "YOUR_WRAPPED_BTC_ADDRESS_HERE",
};
```

### Contract-Side Usage

The contract already supports any token address! You don't need to modify the contract itself. Just pass the token addresses when creating intents:

```rust
// In your transaction
limit_order_contract.create_intent(
    &creator,
    &sell_token_address,  // Any Soroban token contract
    &sell_amount,
    &buy_token_address,   // Any Soroban token contract
    &min_buy_amount,
    &target_price,
    &incentive,
    &expiry
)
```

## Oracle Price Feed Support

### Check Which Assets Reflector Supports

You can query the oracle to see all supported assets:

```rust
let oracle = ReflectorClient::new(&env, &oracle_address);
let supported_assets = oracle.assets(&env);
```

### Common Reflector Oracle Assets

**Testnet Oracle** (`CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP`):

- XLM (Stellar native)
- USDC
- BTC (as symbol)
- ETH (as symbol)
- EUR (as symbol)

**Mainnet DEX Oracle** (`CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M`):

- All major Stellar DEX pairs
- Wrapped assets
- LP tokens

### Important: Price Feed Availability

⚠️ **The oracle must have a price feed for your token pair!**

If you want to trade `TOKEN_A` for `TOKEN_B`, the oracle must provide:

- Price for `TOKEN_A` (in USD or base currency)
- Price for `TOKEN_B` (in USD or base currency)

Then the contract calculates the cross-rate: `TOKEN_A/TOKEN_B = PRICE_A / PRICE_B`

## Example: Adding a New Token Pair

### 1. Find Token Addresses

```bash
# Get EURC contract address
stellar contract id asset --asset EURC:GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2

# Result: CEURC_CONTRACT_ADDRESS_HERE
```

### 2. Update Frontend Token List

```typescript
// src/contracts/limit_order.ts
export const TESTNET_TOKENS = {
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  USDC: "CBBHRKEP5M3NUDRISGLJKGHDHX3DA2CN2AZBQY6WLVUJ7VNLGSKBDUCM",
  EURC: "CEURC_CONTRACT_ADDRESS_HERE", // ✅ Added
};
```

### 3. Update UI Dropdowns

Edit `src/pages/CreateIntent.tsx`:

```typescript
<select name="sellToken" value={form.sellToken} onChange={handleInputChange}>
  <option value={TESTNET_TOKENS.XLM}>XLM</option>
  <option value={TESTNET_TOKENS.USDC}>USDC</option>
  <option value={TESTNET_TOKENS.EURC}>EURC</option> {/* ✅ Added */}
</select>
```

### 4. Test Oracle Price Availability

Before using in production, verify the oracle has prices:

```rust
#[test]
fn test_eurc_price_available() {
    let env = Env::default();
    let oracle = Address::from_string(&env, "CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP");
    let reflector = ReflectorClient::new(&env, &oracle);

    let eurc_address = Address::from_string(&env, "CEURC_CONTRACT_ADDRESS_HERE");
    let eurc_asset = Asset::Stellar(eurc_address);

    let price = reflector.lastprice(&eurc_asset);
    assert!(price.is_some(), "EURC price not available in oracle");
}
```

## Mixing Stellar and External Assets

You can create limit orders between Stellar tokens and external assets:

### Example: XLM → BTC

```rust
// Sell XLM (Stellar asset)
let xlm = Asset::Stellar(xlm_contract_address);

// Buy BTC (External symbol - oracle tracks BTC/USD price)
let btc = Asset::Other(Symbol::new(&env, "BTC"));

// Oracle will calculate: XLM/BTC = (XLM price in USD) / (BTC price in USD)
```

### Example: USDC → ETH

```rust
let usdc = Asset::Stellar(usdc_contract_address);
let eth = Asset::Other(Symbol::new(&env, "ETH"));

// Cross-rate: USDC/ETH
```

## Complete Example: Supporting 10+ Tokens

### Frontend Token Configuration

```typescript
// src/contracts/limit_order.ts
export const SUPPORTED_TOKENS = {
  // Stellar native and stablecoins
  XLM: {
    symbol: "XLM",
    name: "Stellar Lumens",
    address: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    type: "stellar",
    decimals: 7,
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "CBBHRKEP5M3NUDRISGLJKGHDHX3DA2CN2AZBQY6WLVUJ7VNLGSKBDUCM",
    type: "stellar",
    decimals: 7,
  },
  EURC: {
    symbol: "EURC",
    name: "Euro Coin",
    address: "CEURC_ADDRESS_HERE",
    type: "stellar",
    decimals: 7,
  },

  // DEX tokens
  AQUA: {
    symbol: "AQUA",
    name: "Aquarius",
    address: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
    type: "stellar",
    decimals: 7,
  },

  // Wrapped assets (if available)
  wBTC: {
    symbol: "wBTC",
    name: "Wrapped Bitcoin",
    address: "WBTC_ADDRESS_HERE",
    type: "stellar",
    decimals: 8,
  },
  wETH: {
    symbol: "wETH",
    name: "Wrapped Ethereum",
    address: "WETH_ADDRESS_HERE",
    type: "stellar",
    decimals: 18,
  },

  // External assets (Oracle symbols only - cannot be traded directly)
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    type: "external",
    oracleSymbol: "BTC",
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    type: "external",
    oracleSymbol: "ETH",
  },
};
```

## Important Limitations

### ❌ Cannot Do

- Trade external symbols directly (you can't swap BTC → ETH through the contract)
- External symbols are for **price reference only**

### ✅ Can Do

- Trade any Stellar/Soroban token that has an oracle price feed
- Mix Stellar tokens (XLM → USDC, AQUA → XLM, etc.)
- Use external symbols for price triggers (but actual swap uses Stellar tokens)

## Recommended Token Pairs for Limit Orders

| Sell Token | Buy Token | Use Case                   |
| ---------- | --------- | -------------------------- |
| XLM        | USDC      | Take profit when XLM pumps |
| USDC       | XLM       | Buy the dip                |
| AQUA       | USDC      | DEX token profit taking    |
| USDC       | AQUA      | Accumulate DEX tokens      |
| XLM        | EURC      | Hedge to Euro              |
| wBTC       | USDC      | Wrapped BTC profit         |

## Testing Your Token Integration

### 1. Verify Oracle Support

```bash
# Check if oracle has your token
stellar contract invoke \
  --id ORACLE_ADDRESS \
  --network testnet \
  -- \
  lastprice \
  --asset '{"Stellar": "YOUR_TOKEN_ADDRESS"}'
```

### 2. Test Token Transfer

```bash
# Ensure token contract allows transfers
stellar contract invoke \
  --id YOUR_TOKEN_ADDRESS \
  --network testnet \
  -- \
  transfer \
  --from YOUR_ADDRESS \
  --to LIMIT_ORDER_CONTRACT \
  --amount 1000000
```

### 3. Create Test Intent

```bash
# Create a small test intent
stellar contract invoke \
  --id LIMIT_ORDER_CONTRACT \
  --network testnet \
  -- \
  create_intent \
  --creator YOUR_ADDRESS \
  --sell_token YOUR_TOKEN_ADDRESS \
  --sell_amount 1000000 \
  --buy_token USDC_ADDRESS \
  --min_buy_amount 100000 \
  --target_price 1000000 \
  --incentive 10000 \
  --expiry $(date -d "+7 days" +%s)
```

## Summary

To add more tokens to your limit order system:

1. **Find the Soroban contract address** for your token
2. **Verify the oracle has a price feed** for it
3. **Add to frontend token list** (`src/contracts/limit_order.ts`)
4. **Update UI dropdowns** in CreateIntent and ViewIntents pages
5. **Test with small amounts** before going to production

The contract itself is already **multi-asset ready** - no modifications needed!

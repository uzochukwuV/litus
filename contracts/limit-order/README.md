# Intent-Based Limit Order Contract

A decentralized, community-powered limit order system for Stellar built on Soroban smart contracts. Users create limit order "intents" with incentives, and community executors earn rewards by executing them when price conditions are met.

## 🌟 Key Features

- **Decentralized Execution**: Anyone in the community can execute orders when conditions are met
- **Price Oracle Integration**: Uses Reflector Oracle (SEP-40) for trustworthy price verification
- **DEX Integration**: Swaps executed through Soroswap for optimal liquidity
- **Incentive Mechanism**: Creators set rewards for executors
- **Vault System**: Secure per-user token balances with locked funds for active intents
- **TWAP Support**: Option for time-weighted average pricing to prevent manipulation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Creates Intent                     │
│  "Sell 100 XLM when XLM/USDC >= 0.15, reward: 1 XLM"       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Limit Order Contract       │
        │  - Stores intent             │
        │  - Locks funds in vault      │
        │    (101 XLM: 100 + 1 reward) │
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Community Executors Monitor │
        │  - Check Reflector Oracle    │
        │  - Wait for target price     │
        └──────────────────────────────┘
                       │
                       ▼ (Price reaches 0.15)
        ┌──────────────────────────────┐
        │  Executor Calls execute_intent│
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Contract Verifies:          │
        │  1. Oracle price >= 0.15     │
        │  2. Intent not expired       │
        │  3. Executor has buy tokens  │
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Contract Transfers:         │
        │  1. 100 XLM → Executor       │
        │  2. Buy tokens → Creator     │
        │  3. 1 XLM reward → Executor  │
        └──────────────────────────────┘
```

## 📦 Core Components

### 1. Intent Structure

```rust
struct Intent {
    id: u64,                    // Unique identifier
    creator: Address,           // Who created the intent
    sell_token: Address,        // Token to sell
    sell_amount: i128,          // Amount to sell
    buy_token: Address,         // Token to buy
    min_buy_amount: i128,       // Minimum to receive
    target_price: i128,         // Price trigger (scaled)
    incentive: i128,            // Executor reward
    expiry: u64,                // Expiration timestamp
    status: IntentStatus,       // Active/Executed/Cancelled
    executor: Option<Address>,  // Who executed it
    actual_buy_amount: Option<i128>, // Amount received
}
```

### 2. Vault System

Each user has separate balances per token:
- **Available**: Can be withdrawn anytime
- **Locked**: Reserved for active intents

```rust
struct Balance {
    available: i128,  // Free to withdraw
    locked: i128,     // Reserved for intents
}
```

### 3. Price Verification

Uses **Reflector Oracle** (SEP-40) for trustworthy prices:
- Fetches USD prices for both assets
- Calculates price ratio
- Supports TWAP for stability
- Prevents price manipulation

### 4. DEX Integration

Executes swaps through **Soroswap Router**:
- Queries liquidity pools
- Executes optimal swaps
- Handles multi-hop routes if needed

## 🚀 Usage Examples

### Creating an Intent

```rust
// User deposits 101 XLM (100 to sell + 1 incentive)
contract.deposit(xlm_token, 101_0000000, user);

// Create intent: Sell 100 XLM for >= 15 USDC when price >= 0.15
let intent_id = contract.create_intent(
    user,                    // creator
    xlm_token,              // sell XLM
    100_0000000,            // 100 XLM
    usdc_token,             // buy USDC
    15_0000000,             // min 15 USDC
    1_500000,               // target price: 0.15 (scaled by 1e7)
    1_0000000,              // 1 XLM incentive
    expiry_timestamp        // when it expires
);
```

### Executing an Intent (as Community Member)

```rust
// 1. Check if intent is executable
let (is_executable, current_price) = contract.check_intent_executable(intent_id);

if is_executable {
    // 2. Executor obtains USDC from Soroswap (off-chain or atomic)

    // 3. Execute the intent
    contract.execute_intent(
        intent_id,
        executor,           // your address
        16_0000000         // 16 USDC (better than minimum 15)
    );

    // Result:
    // - Executor receives: 100 XLM (to swap) + 1 XLM (reward)
    // - Creator receives: 16 USDC
}
```

### Cancelling an Intent

```rust
// Only creator can cancel
contract.cancel_intent(intent_id, creator);
// Funds unlocked and returned to available balance
```

## 🔗 Integration Addresses (Testnet)

```rust
// Soroswap Router
const ROUTER: &str = "CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS";

// Reflector Oracle (SEP-40)
const ORACLE: &str = "CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP";

// Example tokens
const XLM: &str = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const USDC: &str = "CBBHRKEP5M3NUDRISGLJKGHDHX3DA2CN2AZBQY6WLVUJ7VNLGSKBDUCM";
```

## 💡 Price Calculation

Prices are scaled by `PRICE_SCALE = 1e7` for precision:

```rust
// Example: Set target price of 0.15 USDC per XLM
let target_price = 15 * PRICE_SCALE / 100;  // 0.15 * 1e7 = 1_500_000

// Oracle verification:
// 1. Get XLM price in USD: $0.12
// 2. Get USDC price in USD: $1.00
// 3. Calculate ratio: 0.12 / 1.00 = 0.12
// 4. Scaled: 0.12 * 1e7 = 1_200_000
// 5. Compare: 1_200_000 < 1_500_000 → price NOT met

// When XLM rises to $0.15:
// 1. XLM: $0.15, USDC: $1.00
// 2. Ratio: 0.15 / 1.00 = 0.15
// 3. Scaled: 0.15 * 1e7 = 1_500_000
// 4. Compare: 1_500_000 >= 1_500_000 → price MET ✓
```

## 🎯 Executor Strategy

Executors earn rewards by monitoring intents and executing profitable ones:

1. **Monitor Active Intents**
   ```rust
   let user_intents = contract.get_user_intents(creator);
   ```

2. **Check Price Conditions**
   ```rust
   for intent_id in intents {
       let (executable, price) = contract.check_intent_executable(intent_id);
       if executable {
           // Potential execution opportunity
       }
   }
   ```

3. **Execute Atomically**
   - Obtain buy tokens from DEX
   - Call `execute_intent`
   - Receive sell tokens + reward

4. **Profit Calculation**
   ```
   Profit = Incentive + (Swap_Profit - Gas_Costs)
   ```

## 🔒 Security Features

- **Oracle-based verification**: Prevents price manipulation
- **TWAP option**: Reduces volatility impact
- **Expiry timestamps**: Intents auto-expire
- **Locked funds**: Can't be withdrawn while intent is active
- **Authorization checks**: Only creators can cancel
- **Admin emergency controls**: Pause/cancel if needed

## 📊 Contract Functions

### User Functions

| Function | Description |
|----------|-------------|
| `deposit` | Deposit tokens into vault |
| `withdraw` | Withdraw available tokens |
| `create_intent` | Create new limit order |
| `cancel_intent` | Cancel your intent |
| `get_balance` | Check your balances |
| `get_user_intents` | List your intents |

### Executor Functions

| Function | Description |
|----------|-------------|
| `execute_intent` | Execute an intent |
| `check_intent_executable` | Check if ready to execute |
| `get_intent` | Get intent details |
| `get_price_quote` | Get current market price |

### Admin Functions

| Function | Description |
|----------|-------------|
| `set_router` | Update Soroswap router |
| `set_oracle` | Update price oracle |
| `admin_cancel_intent` | Emergency cancel |

## 🧪 Testing

```bash
# Build contract
cd contracts/limit-order
cargo build --target wasm32-unknown-unknown --release

# Run tests
cargo test
```

## 🚦 Deployment

1. **Deploy Contract**
   ```bash
   stellar contract deploy \
     --wasm target/wasm32-unknown-unknown/release/limit_order.wasm \
     --network testnet
   ```

2. **Initialize**
   ```bash
   stellar contract invoke \
     --id <CONTRACT_ID> \
     --network testnet \
     -- __constructor \
     --admin <ADMIN_ADDRESS> \
     --router CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS \
     --oracle CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP
   ```

## 🎬 Example Flow

```typescript
// 1. User creates intent to sell 100 XLM at 0.15 USDC
const intentId = await contract.create_intent({
  creator: userAddress,
  sell_token: XLM,
  sell_amount: "1000000000", // 100 XLM
  buy_token: USDC,
  min_buy_amount: "150000000", // 15 USDC
  target_price: "1500000", // 0.15
  incentive: "10000000", // 1 XLM
  expiry: Date.now() + 86400 // 24 hours
});

// 2. Executor monitors
setInterval(async () => {
  const [executable, price] = await contract.check_intent_executable(intentId);

  if (executable) {
    // 3. Get USDC from Soroswap
    const usdc = await soroswap.swap(xlm, usdc, amount);

    // 4. Execute intent and claim reward
    await contract.execute_intent(intentId, executorAddress, usdc);
  }
}, 60000); // Check every minute
```

## 🤝 Contributing

This is an open-source project. Contributions welcome!

## 📄 License

MIT License

## 🔗 Resources

- [Soroswap Docs](https://docs.soroswap.finance/)
- [Reflector Oracle](https://reflector.network/)
- [Stellar Soroban](https://soroban.stellar.org/)
- [SEP-40 Standard](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0040.md)

---

**Built with ❤️ for the Stellar ecosystem**

use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum IntentStatus {
    Active,
    Executed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Intent {
    /// Unique intent ID
    pub id: u64,
    /// User who created the intent
    pub creator: Address,
    /// Token to sell
    pub sell_token: Address,
    /// Amount to sell
    pub sell_amount: i128,
    /// Token to buy
    pub buy_token: Address,
    /// Minimum amount of buy_token to receive
    pub min_buy_amount: i128,
    /// Target price (scaled by PRICE_SCALE = 1e7)
    /// price = buy_amount / sell_amount
    pub target_price: i128,
    /// Incentive reward for executor (in sell_token)
    pub incentive: i128,
    /// Expiration timestamp (ledger timestamp)
    pub expiry: u64,
    /// Current status
    pub status: IntentStatus,
    /// Executor address (set when executed)
    pub executor: Option<Address>,
    /// Actual buy amount received (set when executed)
    pub actual_buy_amount: Option<i128>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Balance {
    /// Available balance (can be withdrawn)
    pub available: i128,
    /// Locked balance (reserved for active intents)
    pub locked: i128,
}

/// Price scale factor (1e7 for 7 decimal precision)
pub const PRICE_SCALE: i128 = 10_000_000;

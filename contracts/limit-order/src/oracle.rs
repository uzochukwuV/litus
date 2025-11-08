use soroban_sdk::{contractclient, contracttype, Address, Env, Symbol, Vec};

/// Reflector Oracle Interface (SEP-40 compliant)
/// Documentation: https://reflector.network/
/// Testnet Oracle: CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP
#[contractclient(name = "ReflectorClient")]
pub trait Contract {
    /// Base oracle symbol the price is reported in
    fn base(e: Env) -> Asset;

    /// All assets quoted by the contract
    fn assets(e: Env) -> Vec<Asset>;

    /// Number of decimal places used to represent price for all assets quoted by the oracle
    fn decimals(e: Env) -> u32;

    /// Quotes asset price in base asset at specific timestamp
    fn price(e: Env, asset: Asset, timestamp: u64) -> Option<PriceData>;

    /// Quotes the most recent price for an asset
    fn lastprice(e: Env, asset: Asset) -> Option<PriceData>;

    /// Quotes last N price records for the given asset
    fn prices(e: Env, asset: Asset, records: u32) -> Option<Vec<PriceData>>;

    /// Quotes the most recent cross price record for the pair of assets
    fn x_last_price(e: Env, base_asset: Asset, quote_asset: Asset) -> Option<PriceData>;

    /// Quotes the cross price for the pair of assets at specific timestamp
    fn x_price(e: Env, base_asset: Asset, quote_asset: Asset, timestamp: u64) -> Option<PriceData>;

    /// Quotes last N cross price records of for the pair of assets
    fn x_prices(e: Env, base_asset: Asset, quote_asset: Asset, records: u32) -> Option<Vec<PriceData>>;

    /// Quotes the time-weighted average price for the given asset over N recent records
    fn twap(e: Env, asset: Asset, records: u32) -> Option<i128>;

    /// Quotes the time-weighted average cross price for the given asset pair over N recent records
    fn x_twap(e: Env, base_asset: Asset, quote_asset: Asset, records: u32) -> Option<i128>;

    /// Price feed resolution (default tick period timeframe, in seconds - 5 minutes by default)
    fn resolution(e: Env) -> u32;

    /// Historical records retention period, in seconds (24 hours by default)
    fn period(e: Env) -> Option<u64>;

    /// The most recent price update timestamp
    fn last_timestamp(e: Env) -> u64;

    /// Contract protocol version
    fn version(e: Env) -> u32;

    /// Contract admin address
    fn admin(e: Env) -> Option<Address>;
}

/// Quoted asset definition
#[contracttype(export = false)]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub enum Asset {
    Stellar(Address), // for Stellar Classic and Soroban assets
    Other(Symbol),    // for any external currencies/tokens/assets/symbols
}

/// Price record definition
#[contracttype(export = false)]
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct PriceData {
    pub price: i128,      // asset price at given point in time
    pub timestamp: u64,   // record timestamp
}

/// Possible runtime errors
#[soroban_sdk::contracterror(export = false)]
#[derive(Debug, Copy, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub enum Error {
    AlreadyInitialized = 0,
    Unauthorized = 1,
    AssetMissing = 2,
    AssetAlreadyExists = 3,
    InvalidConfigVersion = 4,
    InvalidTimestamp = 5,
    InvalidUpdateLength = 6,
    AssetLimitExceeded = 7,
}

/// Check if target price condition is met using Reflector Oracle
/// Returns (condition_met, current_price_ratio)
///
/// This function:
/// 1. Fetches USD prices for both assets from Reflector
/// 2. Calculates the price ratio (sell_asset / buy_asset)
/// 3. Compares with trigger price
///
/// @param env: Contract environment
/// @param oracle_address: Reflector oracle contract address
/// @param sell_asset: Asset being sold
/// @param buy_asset: Asset being bought
/// @param trigger_price: Target price ratio (scaled by decimals)
/// @param use_twap: Use TWAP instead of last price for stability
pub fn check_price_trigger(
    env: &Env,
    oracle_address: &Address,
    sell_asset: &Asset,
    buy_asset: &Asset,
    trigger_price: i128,
    use_twap: bool,
) -> (bool, i128) {
    let reflector = ReflectorClient::new(env, oracle_address);

    // Get oracle decimals for proper scaling
    let decimals = reflector.decimals();

    // Fetch prices based on preference (TWAP for stability, lastprice for spot)
    let sell_price = if use_twap {
        reflector.twap(&sell_asset.clone(), &5) // 5 periods for TWAP
    } else {
        reflector.lastprice(&sell_asset.clone()).map(|pd| pd.price)
    };

    let buy_price = if use_twap {
        reflector.twap(&buy_asset.clone(), &5)
    } else {
        reflector.lastprice(&buy_asset.clone()).map(|pd| pd.price)
    };

    // Handle missing prices
    if sell_price.is_none() || buy_price.is_none() {
        return (false, 0);
    }

    let sell_price_value = sell_price.unwrap();
    let buy_price_value = buy_price.unwrap();

    // Calculate price ratio: sell_asset / buy_asset
    // Both prices are in USD terms, so ratio gives us the exchange rate
    // Example: If XLM = $0.12 and USDC = $1.00, then XLM/USDC = 0.12
    let scale = 10_i128.pow(decimals);
    let price_ratio = (sell_price_value * scale) / buy_price_value;

    // Check if price condition is met
    let condition_met = price_ratio >= trigger_price;

    (condition_met, price_ratio)
}

/// Get cross-rate directly from oracle using x_last_price
/// This is more efficient for direct pair prices
pub fn get_cross_rate(
    env: &Env,
    oracle_address: &Address,
    sell_asset: &Asset,
    buy_asset: &Asset,
) -> Option<PriceData> {
    let reflector = ReflectorClient::new(env, oracle_address);
    reflector.x_last_price(&sell_asset.clone(), &buy_asset.clone())
}

/// Get cross-rate TWAP for more stable pricing
pub fn get_cross_rate_twap(
    env: &Env,
    oracle_address: &Address,
    sell_asset: &Asset,
    buy_asset: &Asset,
    records: u32,
) -> Option<i128> {
    let reflector = ReflectorClient::new(env, oracle_address);
    reflector.x_twap(&sell_asset.clone(), &buy_asset.clone(), &records)
}

/// Convert token address to Oracle Asset type
pub fn stellar_asset(address: Address) -> Asset {
    Asset::Stellar(address)
}

/// Convert symbol to Oracle Asset type
pub fn symbol_asset(symbol: Symbol) -> Asset {
    Asset::Other(symbol)
}

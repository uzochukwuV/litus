use soroban_sdk::{Address, Env, Vec, contractclient};

// Soroswap Router Interface
// Based on: https://github.com/soroswap/core/tree/main/contracts/router
// Testnet Router: CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS

#[contractclient(name = "SoroswapRouterClient")]
pub trait SoroswapRouterTrait {
    /// Get amounts out for a swap path
    /// Returns expected output amounts for each step in the path
    fn router_get_amounts_out(e: Env, amount_in: i128, path: Vec<Address>) -> Vec<i128>;

    /// Swap exact tokens for tokens
    /// Swaps an exact amount of input tokens for as many output tokens as possible
    fn swap_exact_tokens_for_tokens(
        e: Env,
        amount_in: i128,
        amount_out_min: i128,
        path: Vec<Address>,
        to: Address,
        deadline: u64,
    ) -> Vec<i128>;
}

/// Get a quote for swapping tokens through Soroswap
/// Returns the expected output amount for a given input amount
pub fn get_swap_quote(
    e: &Env,
    router_address: &Address,
    amount_in: i128,
    path: Vec<Address>,
) -> Vec<i128> {
    let router = SoroswapRouterClient::new(e, router_address);

    // Use router_get_amounts_out to get expected output amounts
    // This performs chained calculations on the pair path
    router.router_get_amounts_out(&amount_in, &path)
}

/// Execute a swap through Soroswap Router
/// Swaps exact input tokens for output tokens with minimum amount protection
pub fn execute_swap(
    e: &Env,
    router_address: &Address,
    amount_in: i128,
    amount_out_min: i128,
    path: Vec<Address>,
    to: &Address,
    deadline: u64,
) -> Vec<i128> {
    let router = SoroswapRouterClient::new(e, router_address);

    // Execute swap_exact_tokens_for_tokens
    router.swap_exact_tokens_for_tokens(
        &amount_in,
        &amount_out_min,
        &path,
        to,
        &deadline,
    )
}

/// Helper to build a swap path (direct swap between two tokens)
pub fn build_swap_path(e: &Env, token_a: Address, token_b: Address) -> Vec<Address> {
    let mut path = Vec::new(e);
    path.push_back(token_a);
    path.push_back(token_b);
    path
}

/// Check if a swap would meet the minimum output requirement
pub fn check_swap_price(
    e: &Env,
    router_address: &Address,
    sell_token: &Address,
    buy_token: &Address,
    sell_amount: i128,
    min_buy_amount: i128,
) -> (bool, i128) {
    let path = build_swap_path(e, sell_token.clone(), buy_token.clone());
    let amounts = get_swap_quote(e, router_address, sell_amount, path);

    // The last element in amounts is the expected output
    if let Some(expected_output) = amounts.last() {
        let meets_minimum = expected_output >= min_buy_amount;
        return (meets_minimum, expected_output);
    }

    (false, 0)
}

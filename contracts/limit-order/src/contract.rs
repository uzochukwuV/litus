use soroban_sdk::{contract, contractimpl, token, Address, Env};

use crate::error::Error;
use crate::storage;
use crate::types::{Balance, Intent, IntentStatus, PRICE_SCALE};

#[contract]
pub struct LimitOrderContract;

#[contractimpl]
impl LimitOrderContract {
    /// Initialize the contract with an admin, Soroswap router, and Reflector oracle
    /// @param admin: Admin address for emergency functions
    /// @param router: Soroswap router contract address for DEX swaps
    /// @param oracle: Reflector oracle contract address for price verification
    ///
    /// Testnet addresses:
    /// - Router: CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS
    /// - Oracle: CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP
    pub fn __constructor(e: Env, admin: Address, router: Address, oracle: Address) {
        storage::set_admin(&e, &admin);
        storage::set_router(&e, &router);
        storage::set_oracle(&e, &oracle);
    }

    /// Deposit tokens into the vault
    /// @param token: Token contract address
    /// @param amount: Amount to deposit
    /// @param from: User depositing the tokens
    pub fn deposit(e: Env, token: Address, amount: i128, from: Address) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        from.require_auth();

        // Transfer tokens from user to contract
        let client = token::Client::new(&e, &token);
        client.transfer(&from, &e.current_contract_address(), &amount);

        // Update user balance
        let mut balance = storage::get_balance(&e, &from, &token);
        balance.available += amount;
        storage::set_balance(&e, &from, &token, &balance);

        Ok(())
    }

    /// Withdraw available tokens from the vault
    /// @param token: Token contract address
    /// @param amount: Amount to withdraw
    /// @param to: Recipient address
    pub fn withdraw(e: Env, token: Address, amount: i128, to: Address) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        to.require_auth();

        // Check available balance
        let mut balance = storage::get_balance(&e, &to, &token);
        if balance.available < amount {
            return Err(Error::InsufficientBalance);
        }

        // Update balance
        balance.available -= amount;
        storage::set_balance(&e, &to, &token, &balance);

        // Transfer tokens to user
        let client = token::Client::new(&e, &token);
        client.transfer(&e.current_contract_address(), &to, &amount);

        Ok(())
    }

    /// Create a new limit order intent
    /// @param sell_token: Token to sell
    /// @param sell_amount: Amount to sell
    /// @param buy_token: Token to buy
    /// @param min_buy_amount: Minimum amount to receive
    /// @param target_price: Target price (scaled by PRICE_SCALE)
    /// @param incentive: Reward for executor
    /// @param expiry: Expiration timestamp
    pub fn create_intent(
        e: Env,
        creator: Address,
        sell_token: Address,
        sell_amount: i128,
        buy_token: Address,
        min_buy_amount: i128,
        target_price: i128,
        incentive: i128,
        expiry: u64,
    ) -> Result<u64, Error> {
        creator.require_auth();

        // Validation
        if sell_amount <= 0 || min_buy_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if target_price <= 0 {
            return Err(Error::InvalidPrice);
        }
        if incentive < 0 || incentive > sell_amount {
            return Err(Error::InvalidAmount);
        }

        let current_time = e.ledger().timestamp();
        if expiry <= current_time {
            return Err(Error::IntentExpired);
        }

        // Check balance and lock funds
        let total_required = sell_amount + incentive;
        let mut balance = storage::get_balance(&e, &creator, &sell_token);

        if balance.available < total_required {
            return Err(Error::InsufficientBalance);
        }

        // Lock the funds
        balance.available -= total_required;
        balance.locked += total_required;
        storage::set_balance(&e, &creator, &sell_token, &balance);

        // Create intent
        let intent_id = storage::get_next_intent_id(&e);
        let intent = Intent {
            id: intent_id,
            creator: creator.clone(),
            sell_token,
            sell_amount,
            buy_token,
            min_buy_amount,
            target_price,
            incentive,
            expiry,
            status: IntentStatus::Active,
            executor: None,
            actual_buy_amount: None,
        };

        storage::set_intent(&e, intent_id, &intent);
        storage::add_user_intent(&e, &creator, intent_id);

        Ok(intent_id)
    }

    /// Execute a limit order intent
    /// This is called by community executors when price conditions are met
    ///
    /// FLOW:
    /// 1. Executor monitors SDEX/AMM prices
    /// 2. When target price is reached, executor calls this function
    /// 3. Contract verifies price and transfers tokens
    /// 4. Executor gets sell_amount + incentive to execute trade on DEX
    /// 5. Executor must provide buy_tokens back to creator
    ///
    /// @param intent_id: ID of the intent to execute
    /// @param executor: Address of the executor
    /// @param buy_amount: Actual amount of buy_token obtained from the swap
    pub fn execute_intent(
        e: Env,
        intent_id: u64,
        executor: Address,
        buy_amount: i128,
    ) -> Result<(), Error> {
        executor.require_auth();

        // Get intent
        let mut intent = storage::get_intent(&e, intent_id)
            .ok_or(Error::IntentNotFound)?;

        // Check intent status
        if intent.status != IntentStatus::Active {
            return Err(Error::IntentAlreadyExecuted);
        }

        // Check expiry
        let current_time = e.ledger().timestamp();
        if current_time > intent.expiry {
            return Err(Error::IntentExpired);
        }

        // Verify minimum buy amount
        if buy_amount < intent.min_buy_amount {
            return Err(Error::MinBuyAmountNotMet);
        }

        // Verify price condition
        // actual_price = buy_amount / sell_amount (scaled by PRICE_SCALE)
        let actual_price = (buy_amount * PRICE_SCALE) / intent.sell_amount;
        if actual_price < intent.target_price {
            return Err(Error::PriceConditionNotMet);
        }

        // Execute the trade flow:
        // 1. Transfer sell tokens from vault to executor (who will swap on DEX/AMM)
        let sell_client = token::Client::new(&e, &intent.sell_token);
        sell_client.transfer(
            &e.current_contract_address(),
            &executor,
            &intent.sell_amount,
        );

        // 2. Executor must have already obtained buy_tokens from DEX and transfers to creator
        let buy_client = token::Client::new(&e, &intent.buy_token);
        buy_client.transfer(&executor, &intent.creator, &buy_amount);

        // 3. Transfer incentive reward to executor
        sell_client.transfer(
            &e.current_contract_address(),
            &executor,
            &intent.incentive,
        );

        // Update creator's balance (unlock the locked funds)
        let mut creator_balance = storage::get_balance(&e, &intent.creator, &intent.sell_token);
        creator_balance.locked -= intent.sell_amount + intent.incentive;
        storage::set_balance(&e, &intent.creator, &intent.sell_token, &creator_balance);

        // Update intent status
        intent.status = IntentStatus::Executed;
        intent.executor = Some(executor);
        intent.actual_buy_amount = Some(buy_amount);
        storage::set_intent(&e, intent_id, &intent);

        Ok(())
    }

    /// Get price quote from Soroswap DEX
    /// This queries the Soroswap router to get the expected output amount
    ///
    /// @param sell_token: Token being sold
    /// @param buy_token: Token being bought
    /// @param sell_amount: Amount of sell token
    /// @returns: Estimated buy amount at current market price
    pub fn get_price_quote(
        e: Env,
        sell_token: Address,
        buy_token: Address,
        sell_amount: i128,
    ) -> Result<i128, Error> {
        let router = storage::get_router(&e).ok_or(Error::Unauthorized)?;

        let (_meets_price, expected_output) = crate::soroswap::check_swap_price(
            &e,
            &router,
            &sell_token,
            &buy_token,
            sell_amount,
            0, // No minimum for price check
        );

        Ok(expected_output)
    }

    /// Get the configured Soroswap router address
    pub fn get_router(e: Env) -> Option<Address> {
        storage::get_router(&e)
    }

    /// Update the Soroswap router address (admin only)
    pub fn set_router(e: Env, admin: Address, router: Address) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin = storage::get_admin(&e).ok_or(Error::Unauthorized)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }

        storage::set_router(&e, &router);
        Ok(())
    }

    /// Get the configured Reflector oracle address
    pub fn get_oracle(e: Env) -> Option<Address> {
        storage::get_oracle(&e)
    }

    /// Update the Reflector oracle address (admin only)
    pub fn set_oracle(e: Env, admin: Address, oracle: Address) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin = storage::get_admin(&e).ok_or(Error::Unauthorized)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }

        storage::set_oracle(&e, &oracle);
        Ok(())
    }

    /// Helper function for executors to check if an intent is executable
    /// @param intent_id: ID of the intent to check
    /// @returns: (is_executable, current_market_buy_amount)
    pub fn check_intent_executable(
        e: Env,
        intent_id: u64,
    ) -> Result<(bool, i128), Error> {
        let intent = storage::get_intent(&e, intent_id)
            .ok_or(Error::IntentNotFound)?;

        // Check if intent is active
        if intent.status != IntentStatus::Active {
            return Ok((false, 0));
        }

        // Check expiry
        let current_time = e.ledger().timestamp();
        if current_time > intent.expiry {
            return Ok((false, 0));
        }

        // Get oracle address
        let oracle = storage::get_oracle(&e).ok_or(Error::Unauthorized)?;

        // Convert token addresses to Oracle Asset types
        let sell_asset = crate::oracle::stellar_asset(intent.sell_token.clone());
        let buy_asset = crate::oracle::stellar_asset(intent.buy_token.clone());

        // Check if price condition is met using Oracle
        let (is_executable, current_price) = crate::oracle::check_price_trigger(
            &e,
            &oracle,
            &sell_asset,
            &buy_asset,
            intent.target_price,
            false, // Use last price for real-time execution
        );

        // Calculate estimated buy amount based on current price
        // price_ratio = (sell_price / buy_price) * scale
        // estimated_buy = (sell_amount * current_price) / scale
        let decimals = crate::oracle::ReflectorClient::new(&e, &oracle).decimals();
        let scale = 10_i128.pow(decimals);
        let estimated_buy_amount = (intent.sell_amount * current_price) / scale;

        Ok((is_executable, estimated_buy_amount))
    }

    /// Cancel an active intent
    /// Only the creator can cancel their own intent
    /// @param intent_id: ID of the intent to cancel
    /// @param creator: Address of the intent creator
    pub fn cancel_intent(e: Env, intent_id: u64, creator: Address) -> Result<(), Error> {
        creator.require_auth();

        // Get intent
        let mut intent = storage::get_intent(&e, intent_id)
            .ok_or(Error::IntentNotFound)?;

        // Verify creator
        if intent.creator != creator {
            return Err(Error::OnlyCreatorCanCancel);
        }

        // Check status
        if intent.status != IntentStatus::Active {
            return Err(Error::IntentAlreadyExecuted);
        }

        // Unlock funds
        let mut balance = storage::get_balance(&e, &creator, &intent.sell_token);
        let total_locked = intent.sell_amount + intent.incentive;
        balance.locked -= total_locked;
        balance.available += total_locked;
        storage::set_balance(&e, &creator, &intent.sell_token, &balance);

        // Update intent status
        intent.status = IntentStatus::Cancelled;
        storage::set_intent(&e, intent_id, &intent);

        Ok(())
    }

    /// Get intent details
    pub fn get_intent(e: Env, intent_id: u64) -> Option<Intent> {
        storage::get_intent(&e, intent_id)
    }

    /// Get user balance for a token
    pub fn get_balance(e: Env, user: Address, token: Address) -> Balance {
        storage::get_balance(&e, &user, &token)
    }

    /// Get all intent IDs for a user
    pub fn get_user_intents(e: Env, user: Address) -> soroban_sdk::Vec<u64> {
        storage::get_user_intents(&e, &user)
    }

    /// Get contract admin
    pub fn get_admin(e: Env) -> Option<Address> {
        storage::get_admin(&e)
    }

    /// Emergency pause - admin can cancel any intent
    /// This is a safety mechanism
    pub fn admin_cancel_intent(e: Env, intent_id: u64, admin: Address) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin = storage::get_admin(&e).ok_or(Error::Unauthorized)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }

        // Get intent
        let mut intent = storage::get_intent(&e, intent_id)
            .ok_or(Error::IntentNotFound)?;

        if intent.status != IntentStatus::Active {
            return Err(Error::IntentAlreadyExecuted);
        }

        // Unlock funds
        let mut balance = storage::get_balance(&e, &intent.creator, &intent.sell_token);
        let total_locked = intent.sell_amount + intent.incentive;
        balance.locked -= total_locked;
        balance.available += total_locked;
        storage::set_balance(&e, &intent.creator, &intent.sell_token, &balance);

        // Update intent
        intent.status = IntentStatus::Cancelled;
        storage::set_intent(&e, intent_id, &intent);

        Ok(())
    }

    /// Query all assets supported by the configured Reflector Oracle
    /// This helps users know which tokens have price feeds available
    /// @returns: Vector of supported assets
    pub fn get_oracle_supported_assets(e: Env) -> Result<soroban_sdk::Vec<crate::oracle::Asset>, Error> {
        let oracle = storage::get_oracle(&e).ok_or(Error::Unauthorized)?;
        let reflector = crate::oracle::ReflectorClient::new(&e, &oracle);
        Ok(reflector.assets())
    }

    /// Get the current price for a specific token from the oracle
    /// @param token: Token contract address
    /// @returns: Latest price data (price and timestamp)
    pub fn get_token_price(
        e: Env,
        token: Address,
    ) -> Result<Option<crate::oracle::PriceData>, Error> {
        let oracle = storage::get_oracle(&e).ok_or(Error::Unauthorized)?;
        let reflector = crate::oracle::ReflectorClient::new(&e, &oracle);
        let asset = crate::oracle::stellar_asset(token);
        Ok(reflector.lastprice(&aset))
    }

    /// Get the oracle decimals (precision)
    /// This is the number of decimal places used for price representation
    /// @returns: Number of decimals (typically 7 or 14)
    pub fn get_oracle_decimals(e: Env) -> Result<u32, Error> {
        let oracle = storage::get_oracle(&e).ok_or(Error::Unauthorized)?;
        let reflector = crate::oracle::ReflectorClient::new(&e, &oracle);
        Ok(reflector.decimals())
    }

    /// Get cross-rate between two tokens directly from the oracle
    /// This is useful for checking if a token pair has a price feed
    /// @param sell_token: First token address
    /// @param buy_token: Second token address
    /// @returns: Cross-rate price data if available
    pub fn get_token_cross_rate(
        e: Env,
        sell_token: Address,
        buy_token: Address,
    ) -> Result<Option<crate::oracle::PriceData>, Error> {
        let oracle = storage::get_oracle(&e).ok_or(Error::Unauthorized)?;
        let sell_asset = crate::oracle::stellar_asset(sell_token);
        let buy_asset = crate::oracle::stellar_asset(buy_token);
        Ok(crate::oracle::get_cross_rate(&e, &oracle, &sell_asset, &buy_asset))
    }

    /// Get TWAP (Time-Weighted Average Price) for a token
    /// Provides more stable pricing over time
    /// @param token: Token contract address
    /// @param records: Number of historical records to average (e.g., 5)
    /// @returns: TWAP price if available
    pub fn get_token_twap(
        e: Env,
        token: Address,
        records: u32,
    ) -> Result<Option<i128>, Error> {
        let oracle = storage::get_oracle(&e).ok_or(Error::Unauthorized)?;
        let reflector = crate::oracle::ReflectorClient::new(&e, &oracle);
        let asset = crate::oracle::stellar_asset(token);
        Ok(reflector.twap(&asset, &records))
    }
}

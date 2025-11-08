#![cfg(test)]

use crate::contract::{LimitOrderContract, LimitOrderContractClient};
use crate::types::{IntentStatus, PRICE_SCALE};
use soroban_sdk::{
    contract, contractimpl, testutils::Address as _, token, Address, Env, String, Symbol,
};

// Mock token contract for testing
#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        token::Stellar::new(e.clone()).initialize(&admin, &decimal, &name, &symbol);
    }

    pub fn mint(e: Env, to: Address, amount: i128) {
        token::Stellar::new(e.clone()).mint(&to, &amount);
    }

    pub fn balance(e: Env, id: Address) -> i128 {
        token::Stellar::new(e.clone()).balance(&id)
    }

    pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        token::Stellar::new(e.clone()).transfer(&from, &to, &amount);
    }
}

fn create_token_contract<'a>(e: &Env, admin: &Address) -> (Address, token::Client<'a>) {
    let contract_id = e.register_contract(None, TokenContract);
    let token_client = token::Client::new(e, &contract_id);

    token_client.initialize(
        admin,
        &7,
        &String::from_str(e, "Test Token"),
        &String::from_str(e, "TST"),
    );

    (contract_id, token_client)
}

#[test]
fn test_deposit_and_withdraw() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user = Address::generate(&e);

    // Create limit order contract
    let contract_id = e.register_contract(None, LimitOrderContract);
    let client = LimitOrderContractClient::new(&e, &contract_id);

    // Initialize contract
    client.__constructor(&admin);

    // Create token and mint to user
    let (token_id, token_client) = create_token_contract(&e, &admin);
    token_client.mint(&user, &1000);

    // Deposit tokens
    client.deposit(&token_id, &500, &user);

    // Check balance
    let balance = client.get_balance(&user, &token_id);
    assert_eq!(balance.available, 500);
    assert_eq!(balance.locked, 0);

    // Withdraw tokens
    client.withdraw(&token_id, &200, &user);

    // Check balance after withdrawal
    let balance = client.get_balance(&user, &token_id);
    assert_eq!(balance.available, 300);
    assert_eq!(balance.locked, 0);
}

#[test]
fn test_create_intent() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let creator = Address::generate(&e);

    // Create limit order contract
    let contract_id = e.register_contract(None, LimitOrderContract);
    let client = LimitOrderContractClient::new(&e, &contract_id);
    client.__constructor(&admin);

    // Create tokens
    let (sell_token_id, sell_token) = create_token_contract(&e, &admin);
    let (buy_token_id, _buy_token) = create_token_contract(&e, &admin);

    // Mint and deposit tokens
    sell_token.mint(&creator, &1000);
    client.deposit(&sell_token_id, &1000, &creator);

    // Create intent: Sell 100 tokens for at least 150 of buy_token
    // Target price: 1.5 (150/100 = 1.5, scaled = 15000000)
    let sell_amount = 100;
    let min_buy_amount = 150;
    let target_price = (min_buy_amount * PRICE_SCALE) / sell_amount; // 1.5 scaled
    let incentive = 5; // 5% incentive
    let expiry = e.ledger().timestamp() + 86400; // 1 day

    let intent_id = client.create_intent(
        &creator,
        &sell_token_id,
        &sell_amount,
        &buy_token_id,
        &min_buy_amount,
        &target_price,
        &incentive,
        &expiry,
    );

    // Check intent
    let intent = client.get_intent(&intent_id).unwrap();
    assert_eq!(intent.id, 0);
    assert_eq!(intent.creator, creator);
    assert_eq!(intent.sell_amount, 100);
    assert_eq!(intent.min_buy_amount, 150);
    assert_eq!(intent.incentive, 5);
    assert_eq!(intent.status, IntentStatus::Active);

    // Check that funds are locked
    let balance = client.get_balance(&creator, &sell_token_id);
    assert_eq!(balance.available, 1000 - 100 - 5); // Total - sell_amount - incentive
    assert_eq!(balance.locked, 105); // sell_amount + incentive
}

#[test]
fn test_execute_intent() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let creator = Address::generate(&e);
    let executor = Address::generate(&e);

    // Create limit order contract
    let contract_id = e.register_contract(None, LimitOrderContract);
    let client = LimitOrderContractClient::new(&e, &contract_id);
    client.__constructor(&admin);

    // Create tokens
    let (sell_token_id, sell_token) = create_token_contract(&e, &admin);
    let (buy_token_id, buy_token) = create_token_contract(&e, &admin);

    // Setup: Creator deposits sell tokens
    sell_token.mint(&creator, &1000);
    client.deposit(&sell_token_id, &1000, &creator);

    // Setup: Executor has buy tokens (from DEX swap)
    buy_token.mint(&executor, &200);

    // Create intent
    let sell_amount = 100;
    let min_buy_amount = 150;
    let target_price = (min_buy_amount * PRICE_SCALE) / sell_amount;
    let incentive = 5;
    let expiry = e.ledger().timestamp() + 86400;

    let intent_id = client.create_intent(
        &creator,
        &sell_token_id,
        &sell_amount,
        &buy_token_id,
        &min_buy_amount,
        &target_price,
        &incentive,
        &expiry,
    );

    // Executor executes the intent with 160 buy tokens (price is met: 160/100 = 1.6 > 1.5)
    let buy_amount = 160;
    client.execute_intent(&intent_id, &executor, &buy_amount);

    // Check intent status
    let intent = client.get_intent(&intent_id).unwrap();
    assert_eq!(intent.status, IntentStatus::Executed);
    assert_eq!(intent.executor, Some(executor.clone()));
    assert_eq!(intent.actual_buy_amount, Some(160));

    // Check balances
    // Creator should have received buy tokens
    assert_eq!(buy_token.balance(&creator), 160);

    // Executor should have received sell tokens + incentive
    assert_eq!(sell_token.balance(&executor), 100 + 5);

    // Creator's locked balance should be released
    let balance = client.get_balance(&creator, &sell_token_id);
    assert_eq!(balance.locked, 0);
}

#[test]
fn test_cancel_intent() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let creator = Address::generate(&e);

    // Create limit order contract
    let contract_id = e.register_contract(None, LimitOrderContract);
    let client = LimitOrderContractClient::new(&e, &contract_id);
    client.__constructor(&admin);

    // Create tokens
    let (sell_token_id, sell_token) = create_token_contract(&e, &admin);
    let (buy_token_id, _buy_token) = create_token_contract(&e, &admin);

    // Setup
    sell_token.mint(&creator, &1000);
    client.deposit(&sell_token_id, &1000, &creator);

    // Create intent
    let sell_amount = 100;
    let min_buy_amount = 150;
    let target_price = (min_buy_amount * PRICE_SCALE) / sell_amount;
    let incentive = 5;
    let expiry = e.ledger().timestamp() + 86400;

    let intent_id = client.create_intent(
        &creator,
        &sell_token_id,
        &sell_amount,
        &buy_token_id,
        &min_buy_amount,
        &target_price,
        &incentive,
        &expiry,
    );

    // Check locked balance
    let balance_before = client.get_balance(&creator, &sell_token_id);
    assert_eq!(balance_before.locked, 105);

    // Cancel intent
    client.cancel_intent(&intent_id, &creator);

    // Check intent status
    let intent = client.get_intent(&intent_id).unwrap();
    assert_eq!(intent.status, IntentStatus::Cancelled);

    // Check that funds are unlocked
    let balance_after = client.get_balance(&creator, &sell_token_id);
    assert_eq!(balance_after.available, 1000);
    assert_eq!(balance_after.locked, 0);
}

#[test]
fn test_get_user_intents() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let creator = Address::generate(&e);

    // Create limit order contract
    let contract_id = e.register_contract(None, LimitOrderContract);
    let client = LimitOrderContractClient::new(&e, &contract_id);
    client.__constructor(&admin);

    // Create tokens
    let (sell_token_id, sell_token) = create_token_contract(&e, &admin);
    let (buy_token_id, _buy_token) = create_token_contract(&e, &admin);

    // Setup
    sell_token.mint(&creator, &10000);
    client.deposit(&sell_token_id, &10000, &creator);

    // Create multiple intents
    let expiry = e.ledger().timestamp() + 86400;

    let intent_id_1 = client.create_intent(
        &creator,
        &sell_token_id,
        &100,
        &buy_token_id,
        &150,
        &(150 * PRICE_SCALE / 100),
        &5,
        &expiry,
    );

    let intent_id_2 = client.create_intent(
        &creator,
        &sell_token_id,
        &200,
        &buy_token_id,
        &300,
        &(300 * PRICE_SCALE / 200),
        &10,
        &expiry,
    );

    // Get user intents
    let user_intents = client.get_user_intents(&creator);
    assert_eq!(user_intents.len(), 2);
    assert_eq!(user_intents.get(0).unwrap(), intent_id_1);
    assert_eq!(user_intents.get(1).unwrap(), intent_id_2);
}

#[test]
#[should_panic(expected = "Error(InsufficientBalance)")]
fn test_insufficient_balance() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let creator = Address::generate(&e);

    // Create limit order contract
    let contract_id = e.register_contract(None, LimitOrderContract);
    let client = LimitOrderContractClient::new(&e, &contract_id);
    client.__constructor(&admin);

    // Create tokens
    let (sell_token_id, sell_token) = create_token_contract(&e, &admin);
    let (buy_token_id, _buy_token) = create_token_contract(&e, &admin);

    // Only deposit 50 tokens
    sell_token.mint(&creator, &50);
    client.deposit(&sell_token_id, &50, &creator);

    // Try to create intent for 100 tokens (should fail)
    let expiry = e.ledger().timestamp() + 86400;
    client.create_intent(
        &creator,
        &sell_token_id,
        &100,
        &buy_token_id,
        &150,
        &(150 * PRICE_SCALE / 100),
        &5,
        &expiry,
    );
}

#[test]
#[should_panic(expected = "Error(PriceConditionNotMet)")]
fn test_price_not_met() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let creator = Address::generate(&e);
    let executor = Address::generate(&e);

    // Create limit order contract
    let contract_id = e.register_contract(None, LimitOrderContract);
    let client = LimitOrderContractClient::new(&e, &contract_id);
    client.__constructor(&admin);

    // Create tokens
    let (sell_token_id, sell_token) = create_token_contract(&e, &admin);
    let (buy_token_id, buy_token) = create_token_contract(&e, &admin);

    // Setup
    sell_token.mint(&creator, &1000);
    client.deposit(&sell_token_id, &1000, &creator);
    buy_token.mint(&executor, &200);

    // Create intent: target price 1.5 (150/100)
    let sell_amount = 100;
    let min_buy_amount = 150;
    let target_price = (min_buy_amount * PRICE_SCALE) / sell_amount;
    let incentive = 5;
    let expiry = e.ledger().timestamp() + 86400;

    let intent_id = client.create_intent(
        &creator,
        &sell_token_id,
        &sell_amount,
        &buy_token_id,
        &min_buy_amount,
        &target_price,
        &incentive,
        &expiry,
    );

    // Try to execute with only 140 buy tokens (price = 1.4 < 1.5, should fail)
    client.execute_intent(&intent_id, &executor, &140);
}

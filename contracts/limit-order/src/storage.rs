use soroban_sdk::{Address, Env, Symbol, symbol_short};
use crate::types::{Balance, Intent};

// Storage keys
const INTENT_COUNTER: Symbol = symbol_short!("COUNTER");
const ADMIN: Symbol = symbol_short!("ADMIN");
const ROUTER: Symbol = symbol_short!("ROUTER");
const ORACLE: Symbol = symbol_short!("ORACLE");

/// Get the next intent ID and increment counter
pub fn get_next_intent_id(e: &Env) -> u64 {
    let counter: u64 = e.storage().instance().get(&INTENT_COUNTER).unwrap_or(0);
    e.storage().instance().set(&INTENT_COUNTER, &(counter + 1));
    counter
}

/// Store an intent
pub fn set_intent(e: &Env, intent_id: u64, intent: &Intent) {
    let key = (Symbol::new(e, "INTENT"), intent_id);
    e.storage().persistent().set(&key, intent);
    e.storage().persistent().extend_ttl(&key, 5184000, 5184000); // ~60 days
}

/// Get an intent
pub fn get_intent(e: &Env, intent_id: u64) -> Option<Intent> {
    let key = (Symbol::new(e, "INTENT"), intent_id);
    e.storage().persistent().get(&key)
}

/// Get user balance for a specific token
pub fn get_balance(e: &Env, user: &Address, token: &Address) -> Balance {
    let key = (Symbol::new(e, "BALANCE"), user, token);
    e.storage().persistent().get(&key).unwrap_or(Balance {
        available: 0,
        locked: 0,
    })
}

/// Set user balance for a specific token
pub fn set_balance(e: &Env, user: &Address, token: &Address, balance: &Balance) {
    let key = (Symbol::new(e, "BALANCE"), user, token);
    e.storage().persistent().set(&key, balance);
    e.storage().persistent().extend_ttl(&key, 5184000, 5184000); // ~60 days
}

/// Get admin address
pub fn get_admin(e: &Env) -> Option<Address> {
    e.storage().instance().get(&ADMIN)
}

/// Set admin address
pub fn set_admin(e: &Env, admin: &Address) {
    e.storage().instance().set(&ADMIN, admin);
}

/// Store intent ID for a user (for enumeration)
pub fn add_user_intent(e: &Env, user: &Address, intent_id: u64) {
    let key = (Symbol::new(e, "USER_INT"), user);
    let mut intents: soroban_sdk::Vec<u64> = e.storage().persistent().get(&key).unwrap_or(soroban_sdk::Vec::new(e));
    intents.push_back(intent_id);
    e.storage().persistent().set(&key, &intents);
    e.storage().persistent().extend_ttl(&key, 5184000, 5184000);
}

/// Get all intent IDs for a user
pub fn get_user_intents(e: &Env, user: &Address) -> soroban_sdk::Vec<u64> {
    let key = (Symbol::new(e, "USER_INT"), user);
    e.storage().persistent().get(&key).unwrap_or(soroban_sdk::Vec::new(e))
}

/// Get Soroswap router address
pub fn get_router(e: &Env) -> Option<Address> {
    e.storage().instance().get(&ROUTER)
}

/// Set Soroswap router address
pub fn set_router(e: &Env, router: &Address) {
    e.storage().instance().set(&ROUTER, router);
}

/// Get Reflector oracle address
pub fn get_oracle(e: &Env) -> Option<Address> {
    e.storage().instance().get(&ORACLE)
}

/// Set Reflector oracle address
pub fn set_oracle(e: &Env, oracle: &Address) {
    e.storage().instance().set(&ORACLE, oracle);
}

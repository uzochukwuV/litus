use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Intent not found
    IntentNotFound = 1,
    /// Intent already executed
    IntentAlreadyExecuted = 2,
    /// Intent cancelled
    IntentCancelled = 3,
    /// Intent expired
    IntentExpired = 4,
    /// Only creator can cancel
    OnlyCreatorCanCancel = 5,
    /// Insufficient balance in vault
    InsufficientBalance = 6,
    /// Price condition not met
    PriceConditionNotMet = 7,
    /// Invalid price
    InvalidPrice = 8,
    /// Invalid amount
    InvalidAmount = 9,
    /// Invalid token address
    InvalidToken = 10,
    /// Unauthorized
    Unauthorized = 11,
    /// Intent still active (cannot withdraw locked funds)
    IntentStillActive = 12,
    /// Transfer failed
    TransferFailed = 13,
    /// Minimum buy amount not met
    MinBuyAmountNotMet = 14,
}

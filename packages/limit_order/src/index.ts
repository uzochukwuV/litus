import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export type IntentStatus = {tag: "Active", values: void} | {tag: "Executed", values: void} | {tag: "Cancelled", values: void};


export interface Intent {
  /**
 * Actual buy amount received (set when executed)
 */
actual_buy_amount: Option<i128>;
  /**
 * Token to buy
 */
buy_token: string;
  /**
 * User who created the intent
 */
creator: string;
  /**
 * Executor address (set when executed)
 */
executor: Option<string>;
  /**
 * Expiration timestamp (ledger timestamp)
 */
expiry: u64;
  /**
 * Unique intent ID
 */
id: u64;
  /**
 * Incentive reward for executor (in sell_token)
 */
incentive: i128;
  /**
 * Minimum amount of buy_token to receive
 */
min_buy_amount: i128;
  /**
 * Amount to sell
 */
sell_amount: i128;
  /**
 * Token to sell
 */
sell_token: string;
  /**
 * Current status
 */
status: IntentStatus;
  /**
 * Target price (scaled by PRICE_SCALE = 1e7)
 * price = buy_amount / sell_amount
 */
target_price: i128;
}


export interface Balance {
  /**
 * Available balance (can be withdrawn)
 */
available: i128;
  /**
 * Locked balance (reserved for active intents)
 */
locked: i128;
}

export const Errors = {
  /**
   * Intent not found
   */
  1: {message:"IntentNotFound"},
  /**
   * Intent already executed
   */
  2: {message:"IntentAlreadyExecuted"},
  /**
   * Intent cancelled
   */
  3: {message:"IntentCancelled"},
  /**
   * Intent expired
   */
  4: {message:"IntentExpired"},
  /**
   * Only creator can cancel
   */
  5: {message:"OnlyCreatorCanCancel"},
  /**
   * Insufficient balance in vault
   */
  6: {message:"InsufficientBalance"},
  /**
   * Price condition not met
   */
  7: {message:"PriceConditionNotMet"},
  /**
   * Invalid price
   */
  8: {message:"InvalidPrice"},
  /**
   * Invalid amount
   */
  9: {message:"InvalidAmount"},
  /**
   * Invalid token address
   */
  10: {message:"InvalidToken"},
  /**
   * Unauthorized
   */
  11: {message:"Unauthorized"},
  /**
   * Intent still active (cannot withdraw locked funds)
   */
  12: {message:"IntentStillActive"},
  /**
   * Transfer failed
   */
  13: {message:"TransferFailed"},
  /**
   * Minimum buy amount not met
   */
  14: {message:"MinBuyAmountNotMet"}
}

export interface Client {
  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposit tokens into the vault
   * @param token: Token contract address
   * @param amount: Amount to deposit
   * @param from: User depositing the tokens
   */
  deposit: ({token, amount, from}: {token: string, amount: i128, from: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw available tokens from the vault
   * @param token: Token contract address
   * @param amount: Amount to withdraw
   * @param to: Recipient address
   */
  withdraw: ({token, amount, to}: {token: string, amount: i128, to: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a create_intent transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a new limit order intent
   * @param sell_token: Token to sell
   * @param sell_amount: Amount to sell
   * @param buy_token: Token to buy
   * @param min_buy_amount: Minimum amount to receive
   * @param target_price: Target price (scaled by PRICE_SCALE)
   * @param incentive: Reward for executor
   * @param expiry: Expiration timestamp
   */
  create_intent: ({creator, sell_token, sell_amount, buy_token, min_buy_amount, target_price, incentive, expiry}: {creator: string, sell_token: string, sell_amount: i128, buy_token: string, min_buy_amount: i128, target_price: i128, incentive: i128, expiry: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a execute_intent transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Execute a limit order intent
   * This is called by community executors when price conditions are met
   * 
   * FLOW:
   * 1. Executor monitors SDEX/AMM prices
   * 2. When target price is reached, executor calls this function
   * 3. Contract verifies price and transfers tokens
   * 4. Executor gets sell_amount + incentive to execute trade on DEX
   * 5. Executor must provide buy_tokens back to creator
   * 
   * @param intent_id: ID of the intent to execute
   * @param executor: Address of the executor
   * @param buy_amount: Actual amount of buy_token obtained from the swap
   */
  execute_intent: ({intent_id, executor, buy_amount}: {intent_id: u64, executor: string, buy_amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_price_quote transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get price quote from Soroswap DEX
   * This queries the Soroswap router to get the expected output amount
   * 
   * @param sell_token: Token being sold
   * @param buy_token: Token being bought
   * @param sell_amount: Amount of sell token
   * @returns: Estimated buy amount at current market price
   */
  get_price_quote: ({sell_token, buy_token, sell_amount}: {sell_token: string, buy_token: string, sell_amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_router transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the configured Soroswap router address
   */
  get_router: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a set_router transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update the Soroswap router address (admin only)
   */
  set_router: ({admin, router}: {admin: string, router: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_oracle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the configured Reflector oracle address
   */
  get_oracle: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a set_oracle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update the Reflector oracle address (admin only)
   */
  set_oracle: ({admin, oracle}: {admin: string, oracle: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a check_intent_executable transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Helper function for executors to check if an intent is executable
   * @param intent_id: ID of the intent to check
   * @returns: (is_executable, current_market_buy_amount)
   */
  check_intent_executable: ({intent_id}: {intent_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<readonly [boolean, i128]>>>

  /**
   * Construct and simulate a cancel_intent transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Cancel an active intent
   * Only the creator can cancel their own intent
   * @param intent_id: ID of the intent to cancel
   * @param creator: Address of the intent creator
   */
  cancel_intent: ({intent_id, creator}: {intent_id: u64, creator: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_intent transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get intent details
   */
  get_intent: ({intent_id}: {intent_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<Intent>>>

  /**
   * Construct and simulate a get_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get user balance for a token
   */
  get_balance: ({user, token}: {user: string, token: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Balance>>

  /**
   * Construct and simulate a get_user_intents transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get all intent IDs for a user
   */
  get_user_intents: ({user}: {user: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<u64>>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get contract admin
   */
  get_admin: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a admin_cancel_intent transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Emergency pause - admin can cancel any intent
   * This is a safety mechanism
   */
  admin_cancel_intent: ({intent_id, admin}: {intent_id: u64, admin: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_oracle_supported_assets transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Query all assets supported by the configured Reflector Oracle
   * This helps users know which tokens have price feeds available
   * @returns: Vector of supported assets
   */
  get_oracle_supported_assets: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<Array<Asset>>>>

  /**
   * Construct and simulate a get_token_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the current price for a specific token from the oracle
   * @param token: Token contract address
   * @returns: Latest price data (price and timestamp)
   */
  get_token_price: ({token}: {token: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<Option<PriceData>>>>

  /**
   * Construct and simulate a get_oracle_decimals transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the oracle decimals (precision)
   * This is the number of decimal places used for price representation
   * @returns: Number of decimals (typically 7 or 14)
   */
  get_oracle_decimals: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a get_token_cross_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get cross-rate between two tokens directly from the oracle
   * This is useful for checking if a token pair has a price feed
   * @param sell_token: First token address
   * @param buy_token: Second token address
   * @returns: Cross-rate price data if available
   */
  get_token_cross_rate: ({sell_token, buy_token}: {sell_token: string, buy_token: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<Option<PriceData>>>>

  /**
   * Construct and simulate a get_token_twap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get TWAP (Time-Weighted Average Price) for a token
   * Provides more stable pricing over time
   * @param token: Token contract address
   * @param records: Number of historical records to average (e.g., 5)
   * @returns: TWAP price if available
   */
  get_token_twap: ({token, records}: {token: string, records: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<Option<i128>>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, router, oracle}: {admin: string, router: string, oracle: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, router, oracle}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAADEludGVudFN0YXR1cwAAAAMAAAAAAAAAAAAAAAZBY3RpdmUAAAAAAAAAAAAAAAAACEV4ZWN1dGVkAAAAAAAAAAAAAAAJQ2FuY2VsbGVkAAAA",
        "AAAAAQAAAAAAAAAAAAAABkludGVudAAAAAAADAAAAC5BY3R1YWwgYnV5IGFtb3VudCByZWNlaXZlZCAoc2V0IHdoZW4gZXhlY3V0ZWQpAAAAAAARYWN0dWFsX2J1eV9hbW91bnQAAAAAAAPoAAAACwAAAAxUb2tlbiB0byBidXkAAAAJYnV5X3Rva2VuAAAAAAAAEwAAABtVc2VyIHdobyBjcmVhdGVkIHRoZSBpbnRlbnQAAAAAB2NyZWF0b3IAAAAAEwAAACRFeGVjdXRvciBhZGRyZXNzIChzZXQgd2hlbiBleGVjdXRlZCkAAAAIZXhlY3V0b3IAAAPoAAAAEwAAACdFeHBpcmF0aW9uIHRpbWVzdGFtcCAobGVkZ2VyIHRpbWVzdGFtcCkAAAAABmV4cGlyeQAAAAAABgAAABBVbmlxdWUgaW50ZW50IElEAAAAAmlkAAAAAAAGAAAALUluY2VudGl2ZSByZXdhcmQgZm9yIGV4ZWN1dG9yIChpbiBzZWxsX3Rva2VuKQAAAAAAAAlpbmNlbnRpdmUAAAAAAAALAAAAJk1pbmltdW0gYW1vdW50IG9mIGJ1eV90b2tlbiB0byByZWNlaXZlAAAAAAAObWluX2J1eV9hbW91bnQAAAAAAAsAAAAOQW1vdW50IHRvIHNlbGwAAAAAAAtzZWxsX2Ftb3VudAAAAAALAAAADVRva2VuIHRvIHNlbGwAAAAAAAAKc2VsbF90b2tlbgAAAAAAEwAAAA5DdXJyZW50IHN0YXR1cwAAAAAABnN0YXR1cwAAAAAH0AAAAAxJbnRlbnRTdGF0dXMAAABLVGFyZ2V0IHByaWNlIChzY2FsZWQgYnkgUFJJQ0VfU0NBTEUgPSAxZTcpCnByaWNlID0gYnV5X2Ftb3VudCAvIHNlbGxfYW1vdW50AAAAAAx0YXJnZXRfcHJpY2UAAAAL",
        "AAAAAQAAAAAAAAAAAAAAB0JhbGFuY2UAAAAAAgAAACRBdmFpbGFibGUgYmFsYW5jZSAoY2FuIGJlIHdpdGhkcmF3bikAAAAJYXZhaWxhYmxlAAAAAAAACwAAACxMb2NrZWQgYmFsYW5jZSAocmVzZXJ2ZWQgZm9yIGFjdGl2ZSBpbnRlbnRzKQAAAAZsb2NrZWQAAAAAAAs=",
        "AAAAAAAAAaBJbml0aWFsaXplIHRoZSBjb250cmFjdCB3aXRoIGFuIGFkbWluLCBTb3Jvc3dhcCByb3V0ZXIsIGFuZCBSZWZsZWN0b3Igb3JhY2xlCkBwYXJhbSBhZG1pbjogQWRtaW4gYWRkcmVzcyBmb3IgZW1lcmdlbmN5IGZ1bmN0aW9ucwpAcGFyYW0gcm91dGVyOiBTb3Jvc3dhcCByb3V0ZXIgY29udHJhY3QgYWRkcmVzcyBmb3IgREVYIHN3YXBzCkBwYXJhbSBvcmFjbGU6IFJlZmxlY3RvciBvcmFjbGUgY29udHJhY3QgYWRkcmVzcyBmb3IgcHJpY2UgdmVyaWZpY2F0aW9uCgpUZXN0bmV0IGFkZHJlc3NlczoKLSBSb3V0ZXI6IENDTUFQWFdWWkQ0VVNFS0RXUllTN0RBNFkzRDdFMlNETUdCRkpVQ0VYVEM3Vk42Q1VCR1dQRlVTCi0gT3JhY2xlOiBDQVZMUDVESDJHSlBaTVZPN0lKWTRDVk9ENU1XRUZUSkZWUEQyWVkyRlFYT1FIUkdISzRENkhMUAAAAA1fX2NvbnN0cnVjdG9yAAAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZyb3V0ZXIAAAAAABMAAAAAAAAABm9yYWNsZQAAAAAAEwAAAAA=",
        "AAAAAAAAAItEZXBvc2l0IHRva2VucyBpbnRvIHRoZSB2YXVsdApAcGFyYW0gdG9rZW46IFRva2VuIGNvbnRyYWN0IGFkZHJlc3MKQHBhcmFtIGFtb3VudDogQW1vdW50IHRvIGRlcG9zaXQKQHBhcmFtIGZyb206IFVzZXIgZGVwb3NpdGluZyB0aGUgdG9rZW5zAAAAAAdkZXBvc2l0AAAAAAMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAARmcm9tAAAAEwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAIxXaXRoZHJhdyBhdmFpbGFibGUgdG9rZW5zIGZyb20gdGhlIHZhdWx0CkBwYXJhbSB0b2tlbjogVG9rZW4gY29udHJhY3QgYWRkcmVzcwpAcGFyYW0gYW1vdW50OiBBbW91bnQgdG8gd2l0aGRyYXcKQHBhcmFtIHRvOiBSZWNpcGllbnQgYWRkcmVzcwAAAAh3aXRoZHJhdwAAAAMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAJ0bwAAAAAAEwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAATdDcmVhdGUgYSBuZXcgbGltaXQgb3JkZXIgaW50ZW50CkBwYXJhbSBzZWxsX3Rva2VuOiBUb2tlbiB0byBzZWxsCkBwYXJhbSBzZWxsX2Ftb3VudDogQW1vdW50IHRvIHNlbGwKQHBhcmFtIGJ1eV90b2tlbjogVG9rZW4gdG8gYnV5CkBwYXJhbSBtaW5fYnV5X2Ftb3VudDogTWluaW11bSBhbW91bnQgdG8gcmVjZWl2ZQpAcGFyYW0gdGFyZ2V0X3ByaWNlOiBUYXJnZXQgcHJpY2UgKHNjYWxlZCBieSBQUklDRV9TQ0FMRSkKQHBhcmFtIGluY2VudGl2ZTogUmV3YXJkIGZvciBleGVjdXRvcgpAcGFyYW0gZXhwaXJ5OiBFeHBpcmF0aW9uIHRpbWVzdGFtcAAAAAANY3JlYXRlX2ludGVudAAAAAAAAAgAAAAAAAAAB2NyZWF0b3IAAAAAEwAAAAAAAAAKc2VsbF90b2tlbgAAAAAAEwAAAAAAAAALc2VsbF9hbW91bnQAAAAACwAAAAAAAAAJYnV5X3Rva2VuAAAAAAAAEwAAAAAAAAAObWluX2J1eV9hbW91bnQAAAAAAAsAAAAAAAAADHRhcmdldF9wcmljZQAAAAsAAAAAAAAACWluY2VudGl2ZQAAAAAAAAsAAAAAAAAABmV4cGlyeQAAAAAABgAAAAEAAAPpAAAABgAAAAM=",
        "AAAAAAAAAgxFeGVjdXRlIGEgbGltaXQgb3JkZXIgaW50ZW50ClRoaXMgaXMgY2FsbGVkIGJ5IGNvbW11bml0eSBleGVjdXRvcnMgd2hlbiBwcmljZSBjb25kaXRpb25zIGFyZSBtZXQKCkZMT1c6CjEuIEV4ZWN1dG9yIG1vbml0b3JzIFNERVgvQU1NIHByaWNlcwoyLiBXaGVuIHRhcmdldCBwcmljZSBpcyByZWFjaGVkLCBleGVjdXRvciBjYWxscyB0aGlzIGZ1bmN0aW9uCjMuIENvbnRyYWN0IHZlcmlmaWVzIHByaWNlIGFuZCB0cmFuc2ZlcnMgdG9rZW5zCjQuIEV4ZWN1dG9yIGdldHMgc2VsbF9hbW91bnQgKyBpbmNlbnRpdmUgdG8gZXhlY3V0ZSB0cmFkZSBvbiBERVgKNS4gRXhlY3V0b3IgbXVzdCBwcm92aWRlIGJ1eV90b2tlbnMgYmFjayB0byBjcmVhdG9yCgpAcGFyYW0gaW50ZW50X2lkOiBJRCBvZiB0aGUgaW50ZW50IHRvIGV4ZWN1dGUKQHBhcmFtIGV4ZWN1dG9yOiBBZGRyZXNzIG9mIHRoZSBleGVjdXRvcgpAcGFyYW0gYnV5X2Ftb3VudDogQWN0dWFsIGFtb3VudCBvZiBidXlfdG9rZW4gb2J0YWluZWQgZnJvbSB0aGUgc3dhcAAAAA5leGVjdXRlX2ludGVudAAAAAAAAwAAAAAAAAAJaW50ZW50X2lkAAAAAAAABgAAAAAAAAAIZXhlY3V0b3IAAAATAAAAAAAAAApidXlfYW1vdW50AAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAQ5HZXQgcHJpY2UgcXVvdGUgZnJvbSBTb3Jvc3dhcCBERVgKVGhpcyBxdWVyaWVzIHRoZSBTb3Jvc3dhcCByb3V0ZXIgdG8gZ2V0IHRoZSBleHBlY3RlZCBvdXRwdXQgYW1vdW50CgpAcGFyYW0gc2VsbF90b2tlbjogVG9rZW4gYmVpbmcgc29sZApAcGFyYW0gYnV5X3Rva2VuOiBUb2tlbiBiZWluZyBib3VnaHQKQHBhcmFtIHNlbGxfYW1vdW50OiBBbW91bnQgb2Ygc2VsbCB0b2tlbgpAcmV0dXJuczogRXN0aW1hdGVkIGJ1eSBhbW91bnQgYXQgY3VycmVudCBtYXJrZXQgcHJpY2UAAAAAAA9nZXRfcHJpY2VfcXVvdGUAAAAAAwAAAAAAAAAKc2VsbF90b2tlbgAAAAAAEwAAAAAAAAAJYnV5X3Rva2VuAAAAAAAAEwAAAAAAAAALc2VsbF9hbW91bnQAAAAACwAAAAEAAAPpAAAACwAAAAM=",
        "AAAAAAAAACpHZXQgdGhlIGNvbmZpZ3VyZWQgU29yb3N3YXAgcm91dGVyIGFkZHJlc3MAAAAAAApnZXRfcm91dGVyAAAAAAAAAAAAAQAAA+gAAAAT",
        "AAAAAAAAAC9VcGRhdGUgdGhlIFNvcm9zd2FwIHJvdXRlciBhZGRyZXNzIChhZG1pbiBvbmx5KQAAAAAKc2V0X3JvdXRlcgAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZyb3V0ZXIAAAAAABMAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAACtHZXQgdGhlIGNvbmZpZ3VyZWQgUmVmbGVjdG9yIG9yYWNsZSBhZGRyZXNzAAAAAApnZXRfb3JhY2xlAAAAAAAAAAAAAQAAA+gAAAAT",
        "AAAAAAAAADBVcGRhdGUgdGhlIFJlZmxlY3RvciBvcmFjbGUgYWRkcmVzcyAoYWRtaW4gb25seSkAAAAKc2V0X29yYWNsZQAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAZvcmFjbGUAAAAAABMAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAKJIZWxwZXIgZnVuY3Rpb24gZm9yIGV4ZWN1dG9ycyB0byBjaGVjayBpZiBhbiBpbnRlbnQgaXMgZXhlY3V0YWJsZQpAcGFyYW0gaW50ZW50X2lkOiBJRCBvZiB0aGUgaW50ZW50IHRvIGNoZWNrCkByZXR1cm5zOiAoaXNfZXhlY3V0YWJsZSwgY3VycmVudF9tYXJrZXRfYnV5X2Ftb3VudCkAAAAAABdjaGVja19pbnRlbnRfZXhlY3V0YWJsZQAAAAABAAAAAAAAAAlpbnRlbnRfaWQAAAAAAAAGAAAAAQAAA+kAAAPtAAAAAgAAAAEAAAALAAAAAw==",
        "AAAAAAAAAJ9DYW5jZWwgYW4gYWN0aXZlIGludGVudApPbmx5IHRoZSBjcmVhdG9yIGNhbiBjYW5jZWwgdGhlaXIgb3duIGludGVudApAcGFyYW0gaW50ZW50X2lkOiBJRCBvZiB0aGUgaW50ZW50IHRvIGNhbmNlbApAcGFyYW0gY3JlYXRvcjogQWRkcmVzcyBvZiB0aGUgaW50ZW50IGNyZWF0b3IAAAAADWNhbmNlbF9pbnRlbnQAAAAAAAACAAAAAAAAAAlpbnRlbnRfaWQAAAAAAAAGAAAAAAAAAAdjcmVhdG9yAAAAABMAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAABJHZXQgaW50ZW50IGRldGFpbHMAAAAAAApnZXRfaW50ZW50AAAAAAABAAAAAAAAAAlpbnRlbnRfaWQAAAAAAAAGAAAAAQAAA+gAAAfQAAAABkludGVudAAA",
        "AAAAAAAAABxHZXQgdXNlciBiYWxhbmNlIGZvciBhIHRva2VuAAAAC2dldF9iYWxhbmNlAAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAABAAAH0AAAAAdCYWxhbmNlAA==",
        "AAAAAAAAAB1HZXQgYWxsIGludGVudCBJRHMgZm9yIGEgdXNlcgAAAAAAABBnZXRfdXNlcl9pbnRlbnRzAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAD6gAAAAY=",
        "AAAAAAAAABJHZXQgY29udHJhY3QgYWRtaW4AAAAAAAlnZXRfYWRtaW4AAAAAAAAAAAAAAQAAA+gAAAAT",
        "AAAAAAAAAEhFbWVyZ2VuY3kgcGF1c2UgLSBhZG1pbiBjYW4gY2FuY2VsIGFueSBpbnRlbnQKVGhpcyBpcyBhIHNhZmV0eSBtZWNoYW5pc20AAAATYWRtaW5fY2FuY2VsX2ludGVudAAAAAACAAAAAAAAAAlpbnRlbnRfaWQAAAAAAAAGAAAAAAAAAAVhZG1pbgAAAAAAABMAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAAKBRdWVyeSBhbGwgYXNzZXRzIHN1cHBvcnRlZCBieSB0aGUgY29uZmlndXJlZCBSZWZsZWN0b3IgT3JhY2xlClRoaXMgaGVscHMgdXNlcnMga25vdyB3aGljaCB0b2tlbnMgaGF2ZSBwcmljZSBmZWVkcyBhdmFpbGFibGUKQHJldHVybnM6IFZlY3RvciBvZiBzdXBwb3J0ZWQgYXNzZXRzAAAAG2dldF9vcmFjbGVfc3VwcG9ydGVkX2Fzc2V0cwAAAAAAAAAAAQAAA+kAAAPqAAAH0AAAAAVBc3NldAAAAAAAAAM=",
        "AAAAAAAAAJFHZXQgdGhlIGN1cnJlbnQgcHJpY2UgZm9yIGEgc3BlY2lmaWMgdG9rZW4gZnJvbSB0aGUgb3JhY2xlCkBwYXJhbSB0b2tlbjogVG9rZW4gY29udHJhY3QgYWRkcmVzcwpAcmV0dXJuczogTGF0ZXN0IHByaWNlIGRhdGEgKHByaWNlIGFuZCB0aW1lc3RhbXApAAAAAAAAD2dldF90b2tlbl9wcmljZQAAAAABAAAAAAAAAAV0b2tlbgAAAAAAABMAAAABAAAD6QAAA+gAAAfQAAAACVByaWNlRGF0YQAAAAAAAAM=",
        "AAAAAAAAAJdHZXQgdGhlIG9yYWNsZSBkZWNpbWFscyAocHJlY2lzaW9uKQpUaGlzIGlzIHRoZSBudW1iZXIgb2YgZGVjaW1hbCBwbGFjZXMgdXNlZCBmb3IgcHJpY2UgcmVwcmVzZW50YXRpb24KQHJldHVybnM6IE51bWJlciBvZiBkZWNpbWFscyAodHlwaWNhbGx5IDcgb3IgMTQpAAAAABNnZXRfb3JhY2xlX2RlY2ltYWxzAAAAAAAAAAABAAAD6QAAAAQAAAAD",
        "AAAAAAAAAPJHZXQgY3Jvc3MtcmF0ZSBiZXR3ZWVuIHR3byB0b2tlbnMgZGlyZWN0bHkgZnJvbSB0aGUgb3JhY2xlClRoaXMgaXMgdXNlZnVsIGZvciBjaGVja2luZyBpZiBhIHRva2VuIHBhaXIgaGFzIGEgcHJpY2UgZmVlZApAcGFyYW0gc2VsbF90b2tlbjogRmlyc3QgdG9rZW4gYWRkcmVzcwpAcGFyYW0gYnV5X3Rva2VuOiBTZWNvbmQgdG9rZW4gYWRkcmVzcwpAcmV0dXJuczogQ3Jvc3MtcmF0ZSBwcmljZSBkYXRhIGlmIGF2YWlsYWJsZQAAAAAAFGdldF90b2tlbl9jcm9zc19yYXRlAAAAAgAAAAAAAAAKc2VsbF90b2tlbgAAAAAAEwAAAAAAAAAJYnV5X3Rva2VuAAAAAAAAEwAAAAEAAAPpAAAD6AAAB9AAAAAJUHJpY2VEYXRhAAAAAAAAAw==",
        "AAAAAAAAAOJHZXQgVFdBUCAoVGltZS1XZWlnaHRlZCBBdmVyYWdlIFByaWNlKSBmb3IgYSB0b2tlbgpQcm92aWRlcyBtb3JlIHN0YWJsZSBwcmljaW5nIG92ZXIgdGltZQpAcGFyYW0gdG9rZW46IFRva2VuIGNvbnRyYWN0IGFkZHJlc3MKQHBhcmFtIHJlY29yZHM6IE51bWJlciBvZiBoaXN0b3JpY2FsIHJlY29yZHMgdG8gYXZlcmFnZSAoZS5nLiwgNSkKQHJldHVybnM6IFRXQVAgcHJpY2UgaWYgYXZhaWxhYmxlAAAAAAAOZ2V0X3Rva2VuX3R3YXAAAAAAAAIAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAHcmVjb3JkcwAAAAAEAAAAAQAAA+kAAAPoAAAACwAAAAM=",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADgAAABBJbnRlbnQgbm90IGZvdW5kAAAADkludGVudE5vdEZvdW5kAAAAAAABAAAAF0ludGVudCBhbHJlYWR5IGV4ZWN1dGVkAAAAABVJbnRlbnRBbHJlYWR5RXhlY3V0ZWQAAAAAAAACAAAAEEludGVudCBjYW5jZWxsZWQAAAAPSW50ZW50Q2FuY2VsbGVkAAAAAAMAAAAOSW50ZW50IGV4cGlyZWQAAAAAAA1JbnRlbnRFeHBpcmVkAAAAAAAABAAAABdPbmx5IGNyZWF0b3IgY2FuIGNhbmNlbAAAAAAUT25seUNyZWF0b3JDYW5DYW5jZWwAAAAFAAAAHUluc3VmZmljaWVudCBiYWxhbmNlIGluIHZhdWx0AAAAAAAAE0luc3VmZmljaWVudEJhbGFuY2UAAAAABgAAABdQcmljZSBjb25kaXRpb24gbm90IG1ldAAAAAAUUHJpY2VDb25kaXRpb25Ob3RNZXQAAAAHAAAADUludmFsaWQgcHJpY2UAAAAAAAAMSW52YWxpZFByaWNlAAAACAAAAA5JbnZhbGlkIGFtb3VudAAAAAAADUludmFsaWRBbW91bnQAAAAAAAAJAAAAFUludmFsaWQgdG9rZW4gYWRkcmVzcwAAAAAAAAxJbnZhbGlkVG9rZW4AAAAKAAAADFVuYXV0aG9yaXplZAAAAAxVbmF1dGhvcml6ZWQAAAALAAAAMkludGVudCBzdGlsbCBhY3RpdmUgKGNhbm5vdCB3aXRoZHJhdyBsb2NrZWQgZnVuZHMpAAAAAAARSW50ZW50U3RpbGxBY3RpdmUAAAAAAAAMAAAAD1RyYW5zZmVyIGZhaWxlZAAAAAAOVHJhbnNmZXJGYWlsZWQAAAAAAA0AAAAaTWluaW11bSBidXkgYW1vdW50IG5vdCBtZXQAAAAAABJNaW5CdXlBbW91bnROb3RNZXQAAAAAAA4=" ]),
      options
    )
  }
  public readonly fromJSON = {
    deposit: this.txFromJSON<Result<void>>,
        withdraw: this.txFromJSON<Result<void>>,
        create_intent: this.txFromJSON<Result<u64>>,
        execute_intent: this.txFromJSON<Result<void>>,
        get_price_quote: this.txFromJSON<Result<i128>>,
        get_router: this.txFromJSON<Option<string>>,
        set_router: this.txFromJSON<Result<void>>,
        get_oracle: this.txFromJSON<Option<string>>,
        set_oracle: this.txFromJSON<Result<void>>,
        check_intent_executable: this.txFromJSON<Result<readonly [boolean, i128]>>,
        cancel_intent: this.txFromJSON<Result<void>>,
        get_intent: this.txFromJSON<Option<Intent>>,
        get_balance: this.txFromJSON<Balance>,
        get_user_intents: this.txFromJSON<Array<u64>>,
        get_admin: this.txFromJSON<Option<string>>,
        admin_cancel_intent: this.txFromJSON<Result<void>>,
        get_oracle_supported_assets: this.txFromJSON<Result<Array<Asset>>>,
        get_token_price: this.txFromJSON<Result<Option<PriceData>>>,
        get_oracle_decimals: this.txFromJSON<Result<u32>>,
        get_token_cross_rate: this.txFromJSON<Result<Option<PriceData>>>,
        get_token_twap: this.txFromJSON<Result<Option<i128>>>
  }
}
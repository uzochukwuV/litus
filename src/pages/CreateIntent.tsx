import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useNotification } from "../hooks/useNotification";
import "../styles/coinbase.css";
import {
  parseTokenAmount,
  parsePrice,
  TESTNET_TOKENS,
  isContractConfigured,
  CONTRACT_ID,
} from "../contracts/limit_order";

interface CreateIntentForm {
  sellToken: string;
  sellAmount: string;
  buyToken: string;
  minBuyAmount: string;
  targetPrice: string;
  incentive: string;
  expiryDays: string;
}

const CreateIntent: React.FC = () => {
  const { address } = useWallet();
  const { addNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateIntentForm>({
    sellToken: TESTNET_TOKENS.XLM,
    sellAmount: "",
    buyToken: TESTNET_TOKENS.USDC,
    minBuyAmount: "",
    targetPrice: "",
    incentive: "",
    expiryDays: "7",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const calculateMinBuyAmount = () => {
    if (form.sellAmount && form.targetPrice) {
      try {
        const sellAmt = parseFloat(form.sellAmount);
        const price = parseFloat(form.targetPrice);
        const minBuy = (sellAmt * price).toFixed(7);
        setForm((prev) => ({ ...prev, minBuyAmount: minBuy }));
      } catch (err) {
        console.error("Error calculating min buy amount:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      addNotification("Please connect your wallet first", "error");
      return;
    }

    if (!isContractConfigured()) {
      addNotification(
        "Contract not configured. Please deploy the contract and set PUBLIC_LIMIT_ORDER_CONTRACT_ID",
        "error"
      );
      return;
    }

    // Validate form
    if (!form.sellAmount || !form.minBuyAmount || !form.targetPrice || !form.incentive) {
      addNotification("Please fill in all required fields", "error");
      return;
    }

    try {
      setIsSubmitting(true);

      // Parse amounts
      const sellAmount = parseTokenAmount(form.sellAmount);
      const minBuyAmount = parseTokenAmount(form.minBuyAmount);
      const targetPrice = parsePrice(form.targetPrice);
      const incentive = parseTokenAmount(form.incentive);
      const expiryTimestamp =
        BigInt(Math.floor(Date.now() / 1000)) +
        BigInt(parseInt(form.expiryDays) * 86400);

      // TODO: Integrate with actual contract client when package is generated
      // For now, just show what would be called
      console.log("Creating intent with params:", {
        creator: address,
        sell_token: form.sellToken,
        sell_amount: sellAmount.toString(),
        buy_token: form.buyToken,
        min_buy_amount: minBuyAmount.toString(),
        target_price: targetPrice.toString(),
        incentive: incentive.toString(),
        expiry: expiryTimestamp.toString(),
      });

      addNotification(
        "Intent creation ready! (Contract integration pending)",
        "success"
      );

      // Reset form
      setForm({
        sellToken: TESTNET_TOKENS.XLM,
        sellAmount: "",
        buyToken: TESTNET_TOKENS.USDC,
        minBuyAmount: "",
        targetPrice: "",
        incentive: "",
        expiryDays: "7",
      });
    } catch (err) {
      console.error("Error creating intent:", err);
      addNotification(
        `Failed to create intent: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cb-container">
      <div className="cb-page-header">
        <h1 className="cb-page-title">Create Limit Order</h1>
        <p className="cb-page-subtitle">
          Set up an intent-based limit order with incentives for executors
        </p>
      </div>

      {!address && (
        <div className="cb-alert cb-alert-info">
          Please connect your wallet to create a limit order
        </div>
      )}

      {!isContractConfigured() && (
        <div className="cb-alert cb-alert-error">
          Contract not configured. Please deploy the limit order contract and set
          PUBLIC_LIMIT_ORDER_CONTRACT_ID in your .env file to: {CONTRACT_ID || "Not deployed"}
        </div>
      )}

      <div className="cb-card" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <form onSubmit={handleSubmit}>
          {/* Sell Token Section */}
          <div className="cb-form-group">
            <label className="cb-label">Sell Token</label>
            <select
              name="sellToken"
              value={form.sellToken}
              onChange={handleInputChange}
              className="cb-select"
              required
            >
              <option value={TESTNET_TOKENS.XLM}>XLM</option>
              <option value={TESTNET_TOKENS.USDC}>USDC</option>
              <option value={TESTNET_TOKENS.AQUA}>AQUA</option>
            </select>
          </div>

          <div className="cb-form-group">
            <label className="cb-label">Sell Amount</label>
            <input
              type="number"
              name="sellAmount"
              value={form.sellAmount}
              onChange={handleInputChange}
              onBlur={calculateMinBuyAmount}
              placeholder="100"
              step="0.0000001"
              min="0"
              className="cb-input"
              required
            />
          </div>

          {/* Buy Token Section */}
          <div className="cb-form-group">
            <label className="cb-label">Buy Token</label>
            <select
              name="buyToken"
              value={form.buyToken}
              onChange={handleInputChange}
              className="cb-select"
              required
            >
              <option value={TESTNET_TOKENS.USDC}>USDC</option>
              <option value={TESTNET_TOKENS.XLM}>XLM</option>
              <option value={TESTNET_TOKENS.AQUA}>AQUA</option>
            </select>
          </div>

          {/* Target Price */}
          <div className="cb-form-group">
            <label className="cb-label">
              Target Price (Buy Token per Sell Token)
            </label>
            <input
              type="number"
              name="targetPrice"
              value={form.targetPrice}
              onChange={handleInputChange}
              onBlur={calculateMinBuyAmount}
              placeholder="0.15"
              step="0.0000001"
              min="0"
              className="cb-input"
              required
            />
            <small style={{ color: "var(--cb-gray-600)", marginTop: "4px", display: "block" }}>
              Price at which you want to execute the swap
            </small>
          </div>

          {/* Min Buy Amount */}
          <div className="cb-form-group">
            <label className="cb-label">Minimum Buy Amount</label>
            <input
              type="number"
              name="minBuyAmount"
              value={form.minBuyAmount}
              onChange={handleInputChange}
              placeholder="15"
              step="0.0000001"
              min="0"
              className="cb-input"
              required
            />
            <small style={{ color: "var(--cb-gray-600)", marginTop: "4px", display: "block" }}>
              Minimum amount of buy token you'll accept
            </small>
          </div>

          {/* Incentive */}
          <div className="cb-form-group">
            <label className="cb-label">Executor Incentive (in Sell Token)</label>
            <input
              type="number"
              name="incentive"
              value={form.incentive}
              onChange={handleInputChange}
              placeholder="1"
              step="0.0000001"
              min="0"
              className="cb-input"
              required
            />
            <small style={{ color: "var(--cb-gray-600)", marginTop: "4px", display: "block" }}>
              Reward for the executor who fulfills your intent
            </small>
          </div>

          {/* Expiry */}
          <div className="cb-form-group">
            <label className="cb-label">Expires In (Days)</label>
            <select
              name="expiryDays"
              value={form.expiryDays}
              onChange={handleInputChange}
              className="cb-select"
              required
            >
              <option value="1">1 Day</option>
              <option value="3">3 Days</option>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>

          {/* Summary Card */}
          {form.sellAmount && form.targetPrice && (
            <div
              style={{
                background: "var(--cb-blue-light)",
                padding: "var(--spacing-md)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--spacing-lg)",
              }}
            >
              <div style={{ fontSize: "14px", color: "var(--cb-gray-700)" }}>
                <strong>Summary:</strong>
                <div style={{ marginTop: "8px" }}>
                  Sell {form.sellAmount} {form.sellToken === TESTNET_TOKENS.XLM ? "XLM" : form.sellToken === TESTNET_TOKENS.USDC ? "USDC" : "AQUA"}
                </div>
                <div>
                  Get ≥ {form.minBuyAmount || "—"} {form.buyToken === TESTNET_TOKENS.USDC ? "USDC" : form.buyToken === TESTNET_TOKENS.XLM ? "XLM" : "AQUA"}
                </div>
                <div>
                  When price ≥ {form.targetPrice}
                </div>
                <div>
                  Executor receives: {form.incentive || "—"} tokens
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="cb-btn cb-btn-primary"
            disabled={!address || isSubmitting || !isContractConfigured()}
            style={{ width: "100%" }}
          >
            {isSubmitting ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className="cb-spinner" style={{ width: "20px", height: "20px" }} />
                Creating Intent...
              </span>
            ) : (
              "Create Limit Order Intent"
            )}
          </button>
        </form>
      </div>

      {/* Info Section */}
      <div className="cb-card" style={{ maxWidth: "600px", margin: "32px auto 0" }}>
        <h3 style={{ marginTop: 0, color: "var(--cb-gray-900)" }}>How It Works</h3>
        <ol style={{ color: "var(--cb-gray-700)", lineHeight: "1.6" }}>
          <li>Create an intent specifying the tokens, amounts, and target price</li>
          <li>Your sell tokens are locked in the contract</li>
          <li>Community executors monitor intents and execute when price conditions are met</li>
          <li>Executors receive your incentive reward for successful execution</li>
          <li>You can cancel anytime before execution to unlock your tokens</li>
        </ol>
      </div>
    </div>
  );
};

export default CreateIntent;

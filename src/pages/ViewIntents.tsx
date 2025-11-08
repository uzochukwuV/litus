import { useState, useEffect } from "react";
import { useWallet } from "../hooks/useWallet";
import { useNotification } from "../hooks/useNotification";
import "../styles/coinbase.css";
import {
  Intent,
  IntentStatus,
  formatTokenAmount,
  formatPrice,
  TESTNET_TOKENS,
  isContractConfigured,
} from "../contracts/limit_order";

type FilterStatus = "all" | IntentStatus;

const ViewIntents: React.FC = () => {
  const { address } = useWallet();
  const { addNotification } = useNotification();
  const [intents, setIntents] = useState<Intent[]>([]);
  const [filteredIntents, setFilteredIntents] = useState<Intent[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterMyIntents, setFilterMyIntents] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);

  // Mock data for demonstration
  const loadMockData = () => {
    const mockIntents: Intent[] = [
      {
        id: 1n,
        creator: address || "GBASEG66SOECYUGOMNYUXZANKMJGFN6FJDRU47HCNL5UZJP72CE4M2S4",
        sell_token: TESTNET_TOKENS.XLM,
        sell_amount: 1000000000n, // 100 XLM
        buy_token: TESTNET_TOKENS.USDC,
        min_buy_amount: 150000000n, // 15 USDC
        target_price: 1500000n, // 0.15
        incentive: 10000000n, // 1 XLM
        expiry: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7), // 7 days from now
        status: IntentStatus.Active,
      },
      {
        id: 2n,
        creator: "GDIFFERENTADDRESS123456789ABCDEFGHIJK",
        sell_token: TESTNET_TOKENS.USDC,
        sell_amount: 500000000n, // 50 USDC
        buy_token: TESTNET_TOKENS.XLM,
        min_buy_amount: 3000000000n, // 300 XLM
        target_price: 60000000n, // 6.0
        incentive: 5000000n, // 0.5 USDC
        expiry: BigInt(Math.floor(Date.now() / 1000) + 86400 * 3),
        status: IntentStatus.Active,
      },
      {
        id: 3n,
        creator: address || "GBASEG66SOECYUGOMNYUXZANKMJGFN6FJDRU47HCNL5UZJP72CE4M2S4",
        sell_token: TESTNET_TOKENS.XLM,
        sell_amount: 2000000000n,
        buy_token: TESTNET_TOKENS.USDC,
        min_buy_amount: 300000000n,
        target_price: 1500000n,
        incentive: 20000000n,
        expiry: BigInt(Math.floor(Date.now() / 1000) - 86400), // Expired
        status: IntentStatus.Expired,
      },
      {
        id: 4n,
        creator: "GEXECUTEDADDRESS789ABCDEFGHIJK",
        sell_token: TESTNET_TOKENS.AQUA,
        sell_amount: 10000000000n,
        buy_token: TESTNET_TOKENS.USDC,
        min_buy_amount: 100000000n,
        target_price: 100000n,
        incentive: 100000000n,
        expiry: BigInt(Math.floor(Date.now() / 1000) + 86400 * 14),
        status: IntentStatus.Executed,
        executor: "GEXECUTORADDRESS456789",
        actual_buy_amount: 105000000n,
      },
    ];
    setIntents(mockIntents);
    setFilteredIntents(mockIntents);
    setIsLoading(false);
  };

  useEffect(() => {
    // TODO: Replace with actual contract call when package is generated
    // For now, load mock data
    loadMockData();
  }, []);

  useEffect(() => {
    let filtered = [...intents];

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((intent) => intent.status === filterStatus);
    }

    // Filter by creator
    if (filterMyIntents && address) {
      filtered = filtered.filter((intent) => intent.creator === address);
    }

    setFilteredIntents(filtered);
  }, [filterStatus, filterMyIntents, intents, address]);

  const getTokenSymbol = (tokenAddress: string): string => {
    if (tokenAddress === TESTNET_TOKENS.XLM) return "XLM";
    if (tokenAddress === TESTNET_TOKENS.USDC) return "USDC";
    if (tokenAddress === TESTNET_TOKENS.AQUA) return "AQUA";
    return "UNKNOWN";
  };

  const getStatusBadgeClass = (status: IntentStatus): string => {
    switch (status) {
      case IntentStatus.Active:
        return "cb-badge-info";
      case IntentStatus.Executed:
        return "cb-badge-success";
      case IntentStatus.Cancelled:
        return "cb-badge-warning";
      case IntentStatus.Expired:
        return "cb-badge-error";
      default:
        return "cb-badge-info";
    }
  };

  const canExecute = (intent: Intent): boolean => {
    return (
      intent.status === IntentStatus.Active &&
      intent.expiry > BigInt(Math.floor(Date.now() / 1000)) &&
      intent.creator !== address
    );
  };

  const canCancel = (intent: Intent): boolean => {
    return (
      intent.status === IntentStatus.Active &&
      intent.creator === address
    );
  };

  const handleExecute = async (intentId: bigint) => {
    if (!address) {
      addNotification("Please connect your wallet", "error");
      return;
    }

    if (!isContractConfigured()) {
      addNotification("Contract not configured", "error");
      return;
    }

    try {
      setIsExecuting(intentId.toString());

      // TODO: Integrate with actual contract client
      console.log("Executing intent:", intentId);

      addNotification(
        "Intent execution ready! (Contract integration pending)",
        "success"
      );
    } catch (err) {
      console.error("Error executing intent:", err);
      addNotification(
        `Failed to execute intent: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setIsExecuting(null);
    }
  };

  const handleCancel = async (intentId: bigint) => {
    if (!address) {
      addNotification("Please connect your wallet", "error");
      return;
    }

    try {
      setIsExecuting(intentId.toString());

      // TODO: Integrate with actual contract client
      console.log("Cancelling intent:", intentId);

      addNotification(
        "Intent cancellation ready! (Contract integration pending)",
        "success"
      );
    } catch (err) {
      console.error("Error cancelling intent:", err);
      addNotification(
        `Failed to cancel intent: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setIsExecuting(null);
    }
  };

  const formatExpiry = (expiry: bigint): string => {
    const expiryDate = new Date(Number(expiry) * 1000);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays} days`;
  };

  return (
    <div className="cb-container">
      <div className="cb-page-header">
        <h1 className="cb-page-title">Limit Order Intents</h1>
        <p className="cb-page-subtitle">
          Browse and execute community limit orders
        </p>
      </div>

      {!isContractConfigured() && (
        <div className="cb-alert cb-alert-error">
          Contract not configured. Please deploy the contract first.
        </div>
      )}

      {/* Filters */}
      <div className="cb-card" style={{ marginBottom: "var(--spacing-lg)" }}>
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-md)",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label className="cb-label">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="cb-select"
            >
              <option value="all">All Statuses</option>
              <option value={IntentStatus.Active}>Active</option>
              <option value={IntentStatus.Executed}>Executed</option>
              <option value={IntentStatus.Cancelled}>Cancelled</option>
              <option value={IntentStatus.Expired}>Expired</option>
            </select>
          </div>

          {address && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "24px" }}>
              <input
                type="checkbox"
                id="myIntents"
                checked={filterMyIntents}
                onChange={(e) => setFilterMyIntents(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="myIntents" style={{ cursor: "pointer", fontWeight: 600 }}>
                My Intents Only
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Intents List */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "var(--spacing-2xl)" }}>
          <div className="cb-spinner" style={{ margin: "0 auto" }} />
          <p style={{ marginTop: "var(--spacing-md)", color: "var(--cb-gray-600)" }}>
            Loading intents...
          </p>
        </div>
      ) : filteredIntents.length === 0 ? (
        <div className="cb-card" style={{ textAlign: "center", padding: "var(--spacing-2xl)" }}>
          <p style={{ color: "var(--cb-gray-600)", fontSize: "18px" }}>
            No intents found matching your filters
          </p>
        </div>
      ) : (
        <div className="cb-grid cb-grid-2">
          {filteredIntents.map((intent) => (
            <div key={intent.id.toString()} className="cb-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "var(--spacing-md)",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, color: "var(--cb-gray-900)" }}>
                    Intent #{intent.id.toString()}
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--cb-gray-600)" }}>
                    {intent.creator === address ? "Your Intent" : `Creator: ${intent.creator.slice(0, 8)}...`}
                  </p>
                </div>
                <span className={`cb-badge ${getStatusBadgeClass(intent.status)}`}>
                  {intent.status}
                </span>
              </div>

              <div
                style={{
                  background: "var(--cb-gray-100)",
                  padding: "var(--spacing-md)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--spacing-md)",
                }}
              >
                <div style={{ marginBottom: "8px" }}>
                  <strong>Sell:</strong> {formatTokenAmount(intent.sell_amount)}{" "}
                  {getTokenSymbol(intent.sell_token)}
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <strong>Buy:</strong> ≥ {formatTokenAmount(intent.min_buy_amount)}{" "}
                  {getTokenSymbol(intent.buy_token)}
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <strong>Target Price:</strong> {formatPrice(intent.target_price)}
                </div>
                <div>
                  <strong>Incentive:</strong> {formatTokenAmount(intent.incentive)}{" "}
                  {getTokenSymbol(intent.sell_token)}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "14px",
                  color: "var(--cb-gray-600)",
                  marginBottom: "var(--spacing-md)",
                }}
              >
                <span>Expires: {formatExpiry(intent.expiry)}</span>
                {intent.status === IntentStatus.Executed && intent.actual_buy_amount && (
                  <span style={{ color: "var(--cb-success)" }}>
                    Got: {formatTokenAmount(intent.actual_buy_amount)} {getTokenSymbol(intent.buy_token)}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                {canExecute(intent) && (
                  <button
                    className="cb-btn cb-btn-success"
                    onClick={() => handleExecute(intent.id)}
                    disabled={isExecuting === intent.id.toString()}
                    style={{ flex: 1 }}
                  >
                    {isExecuting === intent.id.toString() ? "Executing..." : "Execute"}
                  </button>
                )}
                {canCancel(intent) && (
                  <button
                    className="cb-btn cb-btn-secondary"
                    onClick={() => handleCancel(intent.id)}
                    disabled={isExecuting === intent.id.toString()}
                    style={{ flex: 1 }}
                  >
                    {isExecuting === intent.id.toString() ? "Cancelling..." : "Cancel"}
                  </button>
                )}
                {!canExecute(intent) && !canCancel(intent) && intent.status === IntentStatus.Active && (
                  <button className="cb-btn cb-btn-secondary" disabled style={{ flex: 1 }}>
                    Cannot Execute (Your Intent)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Card */}
      <div style={{ marginTop: "var(--spacing-2xl)" }}>
        <div className="cb-grid cb-grid-2">
          <div className="cb-stat-card">
            <div className="cb-stat-label">Total Intents</div>
            <div className="cb-stat-value">{intents.length}</div>
          </div>
          <div className="cb-stat-card" style={{ background: "linear-gradient(135deg, var(--cb-success) 0%, #048A5A 100%)" }}>
            <div className="cb-stat-label">Active Intents</div>
            <div className="cb-stat-value">
              {intents.filter((i) => i.status === IntentStatus.Active).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewIntents;

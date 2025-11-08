import React from "react";
import { Layout, Text } from "@stellar/design-system";
import { useNavigate } from "react-router-dom";
import "../styles/coinbase.css";
import { useWallet } from "../hooks/useWallet";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useWallet();

  return (
    <Layout.Content>
      <Layout.Inset>
        <div className="cb-page-header" style={{ textAlign: "center", marginTop: "var(--spacing-3xl)" }}>
          <h1 className="cb-page-title" style={{ fontSize: "48px" }}>
            Intent-Based Limit Orders
          </h1>
          <p className="cb-page-subtitle" style={{ fontSize: "20px", maxWidth: "700px", margin: "0 auto" }}>
            Community-powered limit orders on Stellar. Set your target price, earn incentives by executing orders for others.
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--spacing-md)", justifyContent: "center", marginTop: "var(--spacing-2xl)" }}>
          <button
            className="cb-btn cb-btn-primary"
            onClick={() => navigate("/create")}
            style={{ fontSize: "18px", padding: "16px 32px" }}
          >
            Create Limit Order
          </button>
          <button
            className="cb-btn cb-btn-secondary"
            onClick={() => navigate("/intents")}
            style={{ fontSize: "18px", padding: "16px 32px" }}
          >
            View All Intents
          </button>
        </div>

        <div className="cb-grid cb-grid-2" style={{ marginTop: "var(--spacing-3xl)" }}>
          <div className="cb-card">
            <h3 style={{ color: "var(--cb-blue)", marginTop: 0 }}>Create Intents</h3>
            <Text as="p" size="md">
              Set limit orders with custom price targets and expiry dates.
              Your funds are safely locked in the contract until execution or cancellation.
            </Text>
          </div>

          <div className="cb-card">
            <h3 style={{ color: "var(--cb-blue)", marginTop: 0 }}>Execute & Earn</h3>
            <Text as="p" size="md">
              Monitor active intents and execute them when price conditions are met.
              Earn incentive rewards for each successful execution.
            </Text>
          </div>

          <div className="cb-card">
            <h3 style={{ color: "var(--cb-blue)", marginTop: 0 }}>Oracle-Verified Prices</h3>
            <Text as="p" size="md">
              Integrated with Reflector Oracle (SEP-40) to verify price conditions
              before execution, ensuring fair and accurate order fulfillment.
            </Text>
          </div>

          <div className="cb-card">
            <h3 style={{ color: "var(--cb-blue)", marginTop: 0 }}>Soroswap Integration</h3>
            <Text as="p" size="md">
              Executes swaps through Soroswap Router for optimal liquidity
              and seamless token exchanges on the Stellar network.
            </Text>
          </div>
        </div>

        {!address && (
          <div className="cb-alert cb-alert-info" style={{ marginTop: "var(--spacing-2xl)", textAlign: "center" }}>
            Connect your wallet to start creating and executing limit orders
          </div>
        )}

        <Text as="h2" size="lg" style={{ marginTop: "var(--spacing-3xl)" }}>
          How It Works
        </Text>

        <div className="cb-card" style={{ marginTop: "var(--spacing-lg)" }}>
          <ol style={{ color: "var(--cb-gray-700)", lineHeight: "1.8", fontSize: "16px" }}>
            <li><strong>Create an Intent:</strong> Specify the tokens you want to trade, target price, and incentive for executors</li>
            <li><strong>Lock Your Funds:</strong> Your sell tokens are securely locked in the smart contract</li>
            <li><strong>Wait for Execution:</strong> Community members monitor intents and execute when price conditions are met</li>
            <li><strong>Automatic Fulfillment:</strong> When executed, you receive your buy tokens and the executor gets the incentive</li>
            <li><strong>Cancel Anytime:</strong> You can cancel your intent before execution to unlock your funds</li>
          </ol>
        </div>

        <div className="cb-stat-card" style={{ marginTop: "var(--spacing-2xl)" }}>
          <div style={{ textAlign: "center" }}>
            <div className="cb-stat-label">Built on Stellar with Soroban Smart Contracts</div>
            <div style={{ fontSize: "18px", marginTop: "var(--spacing-md)", opacity: 0.9 }}>
              Powered by Reflector Oracle & Soroswap DEX
            </div>
          </div>
        </div>
      </Layout.Inset>
    </Layout.Content>
  );
};

export default Home;

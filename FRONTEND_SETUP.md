# Limit Order Frontend Setup

## Overview

The frontend for the intent-based limit order dApp has been created with Coinbase-inspired UI design. The application allows users to create limit order intents and execute orders from other community members.

## Pages Created

### 1. Home Page ([src/pages/Home.tsx](src/pages/Home.tsx))

- Landing page with overview of the limit order system
- Call-to-action buttons to create intents or view existing intents
- Feature cards explaining the system
- How it works section

### 2. Create Intent Page ([src/pages/CreateIntent.tsx](src/pages/CreateIntent.tsx))

- Form to create new limit order intents
- Fields:
  - Sell Token (XLM, USDC, AQUA)
  - Sell Amount
  - Buy Token (XLM, USDC, AQUA)
  - Target Price
  - Minimum Buy Amount (auto-calculated)
  - Executor Incentive
  - Expiry (1-30 days)
- Summary card showing order details
- Validation and error handling

### 3. View Intents Page ([src/pages/ViewIntents.tsx](src/pages/ViewIntents.tsx))

- Grid display of all limit order intents
- Filters:
  - By status (All, Active, Executed, Cancelled, Expired)
  - By creator (My Intents Only)
- Intent cards showing:
  - Sell/Buy amounts and tokens
  - Target price
  - Executor incentive
  - Expiry time
  - Status badge
- Action buttons:
  - Execute (for other users' active intents)
  - Cancel (for your own active intents)
- Statistics cards showing total and active intents

## UI Components

### Coinbase-Style Design System ([src/styles/coinbase.css](src/styles/coinbase.css))

Complete CSS design system with:

- Color palette (blue, success, warning, error, gray scale)
- Spacing system (xs to 3xl)
- Border radius utilities
- Shadow system
- Components:
  - `.cb-card` - Card container
  - `.cb-btn` - Button variants (primary, secondary, success)
  - `.cb-input` - Input fields
  - `.cb-select` - Select dropdowns
  - `.cb-badge` - Status badges
  - `.cb-alert` - Alert boxes
  - `.cb-table` - Tables
  - `.cb-stat-card` - Statistics cards
  - `.cb-spinner` - Loading spinner
  - `.cb-grid` - Grid layout

### Contract Integration ([src/contracts/limit_order.ts](src/contracts/limit_order.ts))

Helper file containing:

- Contract client setup
- TypeScript interfaces for Intent, Balance
- IntentStatus enum
- Token constants for testnet
- Helper functions for formatting/parsing amounts and prices
- PRICE_SCALE constant (10,000,000)

## Routes

The following routes have been added to [App.tsx](src/App.tsx):

- `/` - Home page
- `/create` - Create Intent page
- `/intents` - View Intents page
- `/debug` - Debugger (existing)

Navigation buttons added to header:

- Create (Plus icon)
- Intents (List icon)
- Debugger (Code icon)

## Setup Instructions

### 1. Generate TypeScript Bindings (Development)

For local development, the `stellar scaffold` tool will automatically build and deploy contracts:

```bash
npm run dev
```

This command:

- Builds the limit-order contract to WASM
- Deploys it to local Stellar network
- Generates TypeScript bindings in `packages/limit_order/`
- Starts the frontend dev server

The contract will be automatically available for import:

```typescript
import * as LimitOrder from "limit_order";
```

### 2. Deploy to Testnet (Optional)

For testnet deployment, use the deployment script:

```bash
cd contracts/limit-order
chmod +x deploy.sh
./deploy.sh
```

This will output a contract ID and save it to `contract-id.txt`.

### 2. Configure Environment

Add the contract ID to your `.env` file:

```bash
PUBLIC_LIMIT_ORDER_CONTRACT_ID=<your-contract-id-from-deploy>
```

### 3. Run the Frontend

```bash
npm install
npm run dev
```

### 4. Connect Wallet

- Click "Connect Wallet" in the top right
- Select your wallet (Freighter, etc.)
- Make sure you're on Stellar Testnet

### 5. Fund Your Account

If needed, fund your account from Friendbot:

```bash
curl "https://friendbot.stellar.org?addr=YOUR_ADDRESS"
```

## Current Status

### ✅ Completed

- Coinbase-style design system
- Home landing page
- Create Intent page with form validation
- View Intents page with filtering
- Routing and navigation
- Contract helper utilities
- Mock data for demonstration

### 🚧 Pending (Next Steps)

The frontend UI is complete but needs contract integration:

1. **Generate Contract Bindings**
   - Once the contract is deployed, generate TypeScript bindings using Stellar SDK
   - The contract client helper is ready at `src/contracts/limit_order.ts`

2. **Integrate Contract Calls**
   - Update `CreateIntent.tsx` to call `create_intent()` contract method
   - Update `ViewIntents.tsx` to call:
     - `get_user_intents()` to fetch user's intents
     - `execute_intent()` to execute orders
     - `cancel_intent()` to cancel orders
   - Add deposit/withdraw functionality

3. **Real-time Updates**
   - Use the `useSubscription` hook to listen for contract events
   - Refresh intent list when new intents are created/executed

4. **Price Oracle Integration**
   - Display current market prices from Reflector Oracle
   - Show if intent is executable based on current price

## Testing the UI

Even without contract integration, you can test the UI:

1. **Home Page**: Navigate to `/` to see the landing page
2. **Create Intent**: Go to `/create` and fill out the form (currently shows mock data)
3. **View Intents**: Go to `/intents` to see mock intent cards with filtering

The UI will show notifications indicating that contract integration is pending.

## Contract Integration Example

When integrating with the actual contract, replace the mock code in the submit handlers:

```typescript
// In CreateIntent.tsx
const handleSubmit = async (e: React.FormEvent) => {
  // ... validation ...

  // TODO: Replace this with actual contract call
  const client = getLimitOrderClient(address);
  const result = await client.create_intent({
    creator: address,
    sell_token: form.sellToken,
    sell_amount: sellAmount,
    buy_token: form.buyToken,
    min_buy_amount: minBuyAmount,
    target_price: targetPrice,
    incentive: incentive,
    expiry: expiryTimestamp,
  });

  // Handle result...
};
```

## Design Notes

- UI follows Coinbase.com design aesthetics
- Uses Coinbase blue (#0052FF) as primary color
- Clean, modern cards with subtle shadows
- Responsive grid layout for intent cards
- Clear status badges for intent states
- Informative alerts and notifications
- Mobile-friendly responsive design

## Dependencies

All required dependencies are already in the project:

- React Router for navigation
- Stellar Design System for base components
- Stellar SDK for contract interaction
- Wallet integration via existing WalletProvider
- Notification system via NotificationProvider

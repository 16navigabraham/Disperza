# **App Name**: CeloDisperse

## Core Features:

- Wallet Connection: Connect to user's wallet using Reown (WalletConnect) SDK, supporting major mobile wallets. Display connected wallet address and balance, and validate network (Celo Mainnet).
- Same Amount Dispersion: Send the same amount of a single token to multiple recipients. Supports dynamic recipient address inputs and displays the total amount required. Error handling for invalid inputs.
- Different Amounts Dispersion: Send different amounts of a single token to multiple recipients. Allows adding/removing recipient rows with individual amount inputs and validation.
- Mixed Tokens Dispersion: Send exactly three different tokens to exactly three recipients, each receiving a specific amount of each token. Validates the inputs, tokens and shows total amount per token. Error handling is included.
- Token Allowance Check: Verify that the dispersion contract has sufficient token allowance. Trigger a user approval workflow using the contract's approve functionality when allowance is insufficient, securing funds.
- Transaction Execution and Status: Execute the dispersion transaction using the appropriate contract function based on the chosen mode, with loading states, and display transaction hash with a Celoscan link. Error handling for transaction failures.

## Style Guidelines:

- Primary color: A vibrant and sophisticated shade of green, mimicking Celo's branding (#35D07F).
- Background color: A soft, desaturated green to provide a clean and calming backdrop (#E6F9EC).
- Accent color: A complementary yellow-green (#B0F247) to highlight active elements and calls to action.
- Body and headline font: 'Inter', sans-serif, for a clean and modern look.
- Minimalist icons for tokens and wallet functions.
- Card-based design with a tab system for switching between dispersion modes. Mobile-first, responsive layout.
- Smooth transitions and loading animations during transactions.
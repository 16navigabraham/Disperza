# Disperza - Multi-Chain Token Dispersion Tool

Disperza is a decentralized application (dApp) built for the Celo and Base ecosystems that allows users to send ERC20 tokens to multiple recipients in a single, gas-efficient transaction. It simplifies the process of token distribution, airdrops, and batch payments.

## ✨ Features

- **Multi-Chain Support**: Seamlessly switch between Celo and Base networks.
- **Wallet Connection**: Easily connect your favorite wallet using Web3Modal.
- **Multiple Dispersion Modes**:
  - **Same Amount**: Send the same amount of a single token to many addresses.
  - **Different Amounts**: Send varying amounts of a single token to different addresses in one transaction.
  - **Mixed Tokens**: Send up to three different tokens to three different addresses in one transaction.
- **Transaction Management**: The app handles token approvals and dispersions, providing clear status updates and links to the appropriate block explorer (Celoscan or Basescan).
- **Responsive Design**: A clean, modern UI that works seamlessly on desktop and mobile devices.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Blockchain Interaction**: [ethers.js](https://ethers.io/)
- **Wallet Integration**: [Web3Modal](https://web3modal.com/)
- **UI**: [ShadCN UI](https://ui.shadcn.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **Styling**: Tailwind CSS
- **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)
- **AI (optional)**: [Google's Genkit](https://firebase.google.com/docs/genkit)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- An EVM-compatible wallet (e.g., MetaMask, Valora, Coinbase Wallet)

### Running the Development Server

To run the application locally, use the following command:

```bash
npm run dev
```

This will start the development server, typically on [http://localhost:9002](http://localhost:9002). Open this URL in your browser to see the application.

### Project Structure

- `src/app/`: The main application pages and layout.
- `src/components/`: Reusable React components.
  - `src/components/forms/`: Contains the core logic for the different token sending forms.
  - `src/components/ui/`: Auto-generated ShadCN UI components.
- `src/hooks/`: Custom React hooks, including `use-dispersion.ts` which contains all the blockchain interaction logic.
- `src/lib/`: Contains application constants, ABIs, token lists, and utility functions.
- `src/ai/`: (Optional) Contains Genkit flows for integrating AI features.

## 📜 Smart Contracts

The dApp interacts with pre-deployed `Dispersion` smart contracts on Celo and Base Mainnet.

- **Celo Mainnet**: `0x9006151820055e7FE216866bb81E0C2d9c85dB81` - [View on Celoscan](https://celoscan.io/address/0x9006151820055e7FE216866bb81E0C2d9c85dB81)
- **Base Mainnet**: `0x89814dA44072c7476cC946802F4ABEd47Ca1C758` - [View on Basescan](https://basescan.org/address/0x89814dA44072c7476cC946802F4ABEd47Ca1C758)

The Application Binary Interfaces (ABIs) for the dispersion contract and the standard ERC20 token contract are located in `src/lib/abi.ts`.

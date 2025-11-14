# FHE PAC-MAN DApp

FHE PAC-MAN is a browser-based PAC-MAN game integrated with blockchain through **FHEVM** (Fully Homomorphic Ethereum Virtual Machine). This is a **fun and interactive dApp** that combines classic PAC-MAN gameplay with modern blockchain technology, allowing players to securely store and reveal their high scores on-chain.

---

## 🎯 Purpose of the DApp

- 🕹️ Let players enjoy the classic PAC-MAN experience directly in the browser.
- 🔒 Record and store player scores **securely on the blockchain**.
- 🧩 Encrypt scores so that only authorized users can decrypt them using **Fully Homomorphic Encryption (FHE)**.
- 🌐 Provide an interactive blockchain experience, beyond simple wallet interactions.

---

## ✨ Key Features

- 🖥️ **Browser-Based Gameplay:** Play PAC-MAN directly without installation.
- 🦊 **Wallet Integration:** Connect your Ethereum-compatible wallet via RainbowKit.
- ▶️ **Start and Play:** Begin the game with a simple click and enjoy classic PAC-MAN mechanics.
- 📤 **Upload Scores On-Chain:** Securely save your score to the blockchain.
- 🔑 **Decrypt Best Scores:** Reveal the highest on-chain score using FHE while keeping data private.
- 📱 **Responsive UI:** Modern interface built with Tailwind CSS.
- ✨ **Animated Elements:** Fun visual effects, including a pulsing Pac-Man icon when the wallet is not connected.

---

## 🕹️ Game Rules

1. ⬅️➡️⬆️⬇️ Use arrow keys (or WASD) to move PAC-MAN around the maze.
2. 🍬 Eat all the dots to score points while avoiding ghosts.
3. ⭐ Each dot increases your score; avoid getting caught by ghosts.
4. 💥 Collect power-ups to turn the ghosts vulnerable and earn extra points.
5. 🏁 When the game ends, you can **upload your score** to the blockchain.
6. 🔗 Only connected wallets can submit or decrypt scores.
7. 🏆 The **best on-chain score** can be revealed securely using FHE.

---

## 📋 Prerequinextjss

Before you begin, ensure you have:

- **Node.js** (v18 or higher)
- **pnpm** package manager
- **MetaMask** browser extension
- **Git** for cloning the repository

## 🛠️ Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd pac-man

# Initialize submodules (includes fhevm-hardhat-template)
git submodule update --init --recursive

# Install dependencies
pnpm install
```

### 2. Environment Configuration

Set up your Hardhat environment variables by following the [FHEVM documentation](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional):

- `MNEMONIC`: Your wallet mnemonic phrase
- `INFURA_API_KEY`: Your Infura API key for Sepolia

### 3. Start Development Environment

**Option A: Local Development (Recommended for testing)**

```bash
# Terminal 1: Start local Hardhat node
pnpm chain
# RPC URL: http://127.0.0.1:8545 | Chain ID: 31337

# Terminal 2: Deploy contracts to localhost
pnpm deploy:localhost

# Terminal 3: Start the frontend
pnpm start
```

**Option B: Sepolia Testnet**

```bash
# Deploy to Sepolia testnet
pnpm deploy:sepolia

# Start the frontend
pnpm start
```

### 4. Connect MetaMask

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click "Connect Wallet" and select MetaMask
3. If using localhost, add the Hardhat network to MetaMask:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`

### ⚠️ Sepolia Production note

- In production, `NEXT_PUBLIC_ALCHEMY_API_KEY` must be set (see `packages/nextjs/scaffold.config.ts`). The app throws if missing.
- Ensure `packages/nextjs/contracts/deployedContracts.ts` points to your live contract addresses.
- Optional: set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` for better WalletConnect reliability.
- Optional: add per-chain RPCs via `rpcOverrides` in `packages/nextjs/scaffold.config.ts`.

## 🔧 Troubleshooting

### Common MetaMask + Hardhat Issues

When developing with MetaMask and Hardhat, you may encounter these common issues:

#### ❌ Nonce Mismatch Error

**Problem**: MetaMask tracks transaction nonces, but when you restart Hardhat, the node resets while MetaMask doesn't update its tracking.

**Solution**:

1. Open MetaMask extension
2. Select the Hardhat network
3. Go to **Settings** → **Advanced**
4. Click **"Clear Activity Tab"** (red button)
5. This resets MetaMask's nonce tracking

#### ❌ Cached View Function Results

**Problem**: MetaMask caches smart contract view function results. After restarting Hardhat, you may see outdated data.

**Solution**:

1. **Restart your entire browser** (not just refresh the page)
2. MetaMask's cache is stored in extension memory and requires a full browser restart to clear

> 💡 **Pro Tip**: Always restart your browser after restarting Hardhat to avoid cache issues.

For more details, see the [MetaMask development guide](https://docs.metamask.io/wallet/how-to/run-devnet/).

## 📁 Project Structure

This template uses a monorepo structure with three main packages:

```
pac-man/
├── packages/
│   ├── fhevm-hardhat-template/    # Smart contracts & deployment
│   ├── fhevm-sdk/                 # FHEVM SDK package
│   └── nextjs/                      # React frontend application
└── scripts/                       # Build and deployment scripts
```

### Key Components

#### 🔗 FHEVM Integration (`packages/nextjs/hooks`)

- **`useFHEPacMan.tsx`**: Example hook demonstrating FHEVM contract interaction
- Essential hooks for FHEVM-enabled smart contract communication
- Easily copyable to any FHEVM + React project

#### 🎣 Wallet Management (`packages/nextjs/hooks/helper/`)

- MetaMask wallet provider hooks
- Compatible with EIP-6963 standard
- Easily adaptable for other wallet providers

#### 🔧 Flexibility

- Replace `ethers.js` with `Wagmi` or other React-friendly libraries
- Modular architecture for easy customization
- Support for multiple wallet providers

## 📚 Additional Resources

### Official Documentation

- [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/) - Complete FHEVM guide
- [FHEVM Hardhat Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat) - Hardhat integration
- [Relayer SDK Documentation](https://docs.zama.ai/protocol/relayer-sdk-guides/) - SDK reference
- [Environment Setup](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional) - MNEMONIC & API keys

### Development Tools

- [MetaMask + Hardhat Setup](https://docs.metamask.io/wallet/how-to/run-devnet/) - Local development
- [React Documentation](https://reactjs.org/) - React framework guide

### Community & Support

- [FHEVM Discord](https://discord.com/invite/zama) - Community support
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues) - Bug reports & feature requests

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.

```markdown
# 0G Swap Auto-Bot 🤖

![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.x-green)

Automated trading bot for swapping tokens on the 0G Testnet. Supports ETH, USDT, and BTC token pairs with configurable swap amounts and iterations.

## Features ✨

- **Multi-token Support**: Swap between ETH, USDT, and BTC
- **Automated Approvals**: Handles token approvals automatically
- **Gas Optimization**: Configurable gas settings
- **Error Handling**: Automatic retries with cooldown periods
- **Interactive CLI**: Easy-to-use command line interface

## Prerequisites 📋

- Node.js v18+
- npm/yarn
- Private keys stored in `private_keys.txt`
- Testnet ETH (A0GI) for gas fees
```
## Installation ⚙️

1. Clone the repository:
   ```bash
   git clone https://github.com/zidanaetrna/0g-swap.git
   cd 0g-swap
   ```

2. Install dependencies:
   ```bash
   npm install
   cd src/
   ```

3. Add your private keys to `private_keys.txt` (one per line)
    ```bash
   nano private_keys.txt
   ```

## Configuration ⚡

Edit the following constants in the script:

```javascript
const CONFIG = {
    RPC_URL: 'https://evmrpc-testnet.0g.ai',
    GAS_MAX_GWEI: 7.5, // Maximum gas price
    GAS_LIMIT: 280000, // Gas limit per transaction
    COOLDOWN: { SUCCESS: [15, 120], ERROR: [30, 180] } // Min/max seconds between operations
};
```

## Usage 🚀

Run the bot:
```bash
node bot.js
```

Follow the interactive prompts:
1. Select "Automatic swap" (Option 1)
2. Choose input token (ETH/USDT/BTC)
3. Choose output token
4. Enter swap amount
5. Specify number of iterations

## Example Workflow 🔄

```text
1. Approves tokenIn for spending
2. Swaps tokenIn → tokenOut
3. Approves tokenOut for spending
4. Swaps 50% of tokenOut → tokenIn
5. Repeats for specified iterations
```

## License 📜

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer ⚠️

Currently the official swap routers is not supported for ETH > BTC swap

This is experimental software. Use at your own risk. The developers are not responsible for any funds lost due to bugs or improper configuration.

```

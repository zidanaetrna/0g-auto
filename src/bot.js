const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PROJECT_NAME = process.env.PROJECT_NAME || "0g-swap";
const CREATOR_NAME = process.env.CREATOR_NAME || "aetrna";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const CONFIG = {
    RPC_URL: 'https://evmrpc-testnet.0g.ai',
    PRIVATE_KEY_FILE: path.join(__dirname, 'private_keys.txt'),
    MAX_RETRIES: 5,
    GAS_MAX_GWEI: 7.5, // From your last request
    GAS_LIMIT: 280000,
    COOLDOWN: { SUCCESS: [15, 120], ERROR: [30, 180] },
    RPC_TIMEOUT: 10,
    RPC_RETRY_DELAY: 10,
};

const TOKEN_ADDRESSES = {
    ROUTER: '0xD86b764618c6E3C078845BE3c3fCe50CE9535Da7',
    USDT: '0x9A87C2412d500343c073E5Ae5394E3bE3874F76b',
    ETH: '0xce830D0905e0f7A9b300401729761579c5FB6bd6',
    BTC: '0x1e0d871472973c562650e991ed8006549f8cbefc',
};

const TOKEN_DETAILS = {
    USDT: { decimals: 6, name: 'USDT' },
    ETH: { decimals: 18, name: 'ETH' },
    BTC: { decimals: 8, name: 'BTC' },
};

const ROUTER_ABI = [
    {
        inputs: [
            {
                components: [
                    { internalType: 'address', name: 'tokenIn', type: 'address' },
                    { internalType: 'address', name: 'tokenOut', type: 'address' },
                    { internalType: 'uint24', name: 'fee', type: 'uint24' },
                    { internalType: 'address', name: 'recipient', type: 'address' },
                    { internalType: 'uint256', name: 'deadline', type: 'uint256' },
                    { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
                    { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' },
                    { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
                ],
                internalType: 'struct ISwapRouter.ExactInputSingleParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'exactInputSingle',
        outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
        stateMutability: 'payable',
        type: 'function',
    },
];

const TOKEN_ABI = [
    {
        constant: false,
        inputs: [
            { name: '_spender', type: 'address' },
            { name: '_value', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: true,
        inputs: [
            { name: '_owner', type: 'address' },
            { name: '_spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
];

const randomRange = (min, max) => Math.random() * (max - min) + min;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function displayInterface() {
    console.log(`================ ${PROJECT_NAME} Auto-bot ==========================`);
    console.log("");
    console.log("..%%%%...%%%%%%..%%%%%%..%%%%%...%%..%%...%%%%..");
    console.log(".%%..%%..%%........%%....%%..%%..%%%.%%..%%..%%.");
    console.log(".%%%%%%..%%%%......%%....%%%%%...%%.%%%..%%%%%%.");
    console.log(".%%..%%..%%........%%....%%..%%..%%..%%..%%..%%.");
    console.log(".%%..%%..%%%%%%....%%....%%..%%..%%..%%..%%..%%.");
    console.log("................................................");
    console.log("");
    console.log("choose what you want to do:");
    console.log("");
    console.log("[1]  Automatic swap");
    console.log("");
    console.log(`================= Created by: ${CREATOR_NAME} ==========================`);
    console.log("");
}

async function setupPrivateKeys() {
    if (fs.existsSync(CONFIG.PRIVATE_KEY_FILE)) {
        const keys = fs.readFileSync(CONFIG.PRIVATE_KEY_FILE, 'utf8').split('\n').filter((key) => key.trim());
        if (keys.length > 0) return keys;
    }
    throw new Error('No private keys found in private_keys.txt');
}

async function approveToken(wallet, tokenAddress, amount, provider) {
    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet.connect(provider));
    const gasPrice = ethers.parseUnits(CONFIG.GAS_MAX_GWEI.toString(), 'gwei');
    console.log(`Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} A0GI`);

    const allowance = await tokenContract.allowance(wallet.address, TOKEN_ADDRESSES.ROUTER);
    if (allowance >= amount) {
        console.log('Approval already sufficient, skipping...');
        return { transactionHash: 'skipped' };
    }

    const tx = await tokenContract.approve(TOKEN_ADDRESSES.ROUTER, amount, { gasLimit: CONFIG.GAS_LIMIT, gasPrice });
    console.log(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
    return receipt;
}

async function performSwap(wallet, tokenIn, tokenOut, amountIn, provider) {
    const tokenOutContract = new ethers.Contract(tokenOut, TOKEN_ABI, provider);
    const balanceBefore = await tokenOutContract.balanceOf(wallet.address);

    const routerContract = new ethers.Contract(TOKEN_ADDRESSES.ROUTER, ROUTER_ABI, wallet.connect(provider));
    const params = {
        tokenIn,
        tokenOut,
        fee: 3000,
        recipient: wallet.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
    };

    const gasPrice = ethers.parseUnits(CONFIG.GAS_MAX_GWEI.toString(), 'gwei');
    const tx = await routerContract.exactInputSingle(params, {
        gasLimit: CONFIG.GAS_LIMIT,
        gasPrice,
        value: tokenIn === ethers.ZeroAddress ? amountIn : 0,
    });
    console.log(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

    const balanceAfter = await tokenOutContract.balanceOf(wallet.address);
    const amountOut = BigInt(balanceAfter) - BigInt(balanceBefore);
    return ethers.toBigInt(amountOut);
}

async function getSwapDetails() {
    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    const tokenInName = (await question('Token you want to swap (ETH, USDT, BTC): ')).toUpperCase();
    const tokenInAddr = Object.keys(TOKEN_DETAILS).find((key) => TOKEN_DETAILS[key].name === tokenInName);
    if (!tokenInAddr) throw new Error('Invalid token selected.');

    const tokenOutName = (await question(`Swap ${tokenInName} for (ETH, USDT, BTC): `)).toUpperCase();
    const tokenOutAddr = Object.keys(TOKEN_DETAILS).find((key) => TOKEN_DETAILS[key].name === tokenOutName);
    if (!tokenOutAddr || tokenOutAddr === tokenInAddr) throw new Error('Invalid or same token selected.');

    const amountInput = await question(`Enter amount (e.g., 0.1 ${tokenInName} or 0.1): `);
    const amountMatch = amountInput.match(/(\d*\.?\d+)/);
    if (!amountMatch) throw new Error('Invalid amount format.');
    const amount = ethers.parseUnits(amountMatch[1], TOKEN_DETAILS[tokenInAddr].decimals);

    const iterations = parseInt(await question('How many times do you want to swap? '));
    if (isNaN(iterations) || iterations <= 0) throw new Error('Invalid number of iterations.');

    return {
        tokenIn: TOKEN_ADDRESSES[tokenInAddr],
        tokenOut: TOKEN_ADDRESSES[tokenOutAddr],
        tokenInName: TOKEN_DETAILS[tokenInAddr].name,
        tokenOutName: TOKEN_DETAILS[tokenOutAddr].name,
        amount,
        iterations,
    };
}

async function runSwapBot() {
    const privateKeys = await setupPrivateKeys();
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const wallet = new ethers.Wallet(privateKeys[0], provider);
    console.log(`Using wallet: ${wallet.address}`);

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    // Display the interface and get user choice
    displayInterface();
    const choice = await question('Enter your choice (1): ');

    switch (choice) {
        case '1': // Automatic swap
            const { tokenIn, tokenOut, tokenInName, tokenOutName, amount, iterations } = await getSwapDetails();

            for (let i = 0; i < iterations; i++) {
                try {
                    console.log(`\nSwap iteration ${i + 1}/${iterations}`);

                    // Step 1: tokenIn > tokenOut
                    console.log(`Approving ${tokenInName}...`);
                    await approveToken(wallet, tokenIn, amount, provider);

                    console.log(`Swapping ${ethers.formatUnits(amount, TOKEN_DETAILS[tokenInName].decimals)} ${tokenInName} to ${tokenOutName}...`);
                    const amountOut = await performSwap(wallet, tokenIn, tokenOut, amount, provider);
                    const amountOutFormatted = ethers.formatUnits(amountOut, TOKEN_DETAILS[tokenOutName].decimals);
                    console.log(`Received ${amountOutFormatted} ${tokenOutName}`);

                    // Step 2: tokenOut > tokenIn (50% of amountOut)
                    const amountBack = amountOut / 2n;
                    console.log(`Approving ${tokenOutName}...`);
                    await approveToken(wallet, tokenOut, amountBack, provider);

                    console.log(`Swapping ${ethers.formatUnits(amountBack, TOKEN_DETAILS[tokenOutName].decimals)} ${tokenOutName} back to ${tokenInName}...`);
                    await performSwap(wallet, tokenOut, tokenIn, amountBack, provider);

                    console.log(`Iteration ${i + 1} completed successfully`);
                    await sleep(randomRange(...CONFIG.COOLDOWN.SUCCESS) * 1000);
                } catch (error) {
                    console.error(`Error in iteration ${i + 1}: ${error.message}`);
                    await sleep(randomRange(...CONFIG.COOLDOWN.ERROR) * 1000);
                    const continueAnswer = await question('Continue? (y/n): ');
                    if (continueAnswer.toLowerCase() !== 'y') break;
                }
            }
            break;

        case '2': // Automatic send
            console.log('Automatic send functionality is not yet implemented.');
            break;

        case '3': // Both (swap and send)
            console.log('Combined swap and send functionality is not yet implemented.');
            break;

        case '4': // Swap via QuickSwap
            console.log('Swap via QuickSwap functionality is not yet implemented.');
            break;

        default:
            console.log('Invalid choice. Please select a number between 1 and 4.');
            break;
    }

    rl.close();
    console.log('Bot stopped.');
}

// Run the bot directly
runSwapBot().catch((error) => {
    console.error('Bot crashed:', error);
    rl.close();
    process.exit(1);
});
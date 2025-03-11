import { TwitterApi, StreamingV2Params } from 'twitter-api-v2';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import { Connection, PublicKey, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import * as fs from 'fs/promises'; // Use fs/promises for async operations
import * as path from 'path';



// Replace 'YOUR_BEARER_TOKEN' with your actual bearer token
const bearerToken = 'YOUR_BEARER_TOKEN';

// Create a new Twitter API client
const twitterClient = new TwitterApi(bearerToken);

// Obtain a read-only client
const readOnlyClient = twitterClient.readOnly;

async function setupSearchStream(keywords: string[]) {
  const rules = await readOnlyClient.v2.getRules();

  //Delete existing rules.
  if (rules.data && rules.data.length > 0) {
    await twitterClient.v2.updateRules({
      delete: { ids: rules.data.map(rule => rule.id) },
    });
  }

  // Add new rules
  const newRules = keywords.map(keyword => ({ value: keyword }));
  await twitterClient.v2.updateRules({
    add: newRules,
  });

  const stream = twitterClient.v2.searchStream({
    'tweet.fields': ['created_at', 'author_id', 'text'],
    'user.fields': ['username', 'follower_count'],
  });

  stream.on('data', async (tweet) => {
    console.log('Tweet received:', tweet);

    // Access tweet data
    const tweetText = tweet.data.text;
    const authorId = tweet.data.author_id;
    const createdAt = tweet.data.created_at;

    //Access User Data.
    const user = tweet.includes.includes.users?.find(user => user.id === authorId);
    const username = user?.username;
    const followers = user?.follower_count;

    console.log(`\nTweet: ${tweetText}`);
    console.log(`Author: @${username} (Followers: ${followers})`);
    console.log(`Created at: ${createdAt}`);
  });

  stream.on('error', (error) => {
    console.error('Stream error:', error);
  });

  stream.on('close', () => {
    console.log('Stream closed.');
  });

  stream.on('reconnect', () => {
    console.log('Stream reconnecting...');
  });

  await stream.connect({ autoReconnect: true });
}

// Example usage
const keywordsToSearch = ['SOL', 'CA', 'memecoin'];
setupSearchStream(keywordsToSearch).catch(console.error);

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with your actual bot token
const botToken = 'YOUR_TELEGRAM_BOT_TOKEN';

// Replace '@YourUsername' with your telegram username, or the chat ID you wish to send messages to.
const chatId = '@YourUsername'; //or a chat ID (number)

// Create a new Telegraf bot instance
const telegramBot = new Telegraf(botToken);

// Example command handler
telegramBot.start((ctx) => {
  ctx.reply('Welcome to my bot!');
});

// Example message handler
telegramBot.on('text', (ctx) => {
  ctx.reply(`You said: ${ctx.message.text}`);
});

// Function to send a message to a specific chat
async function notifyTelegram(message: string) {
  try {
    await telegramBot.telegram.sendMessage(chatId, message);
    console.log(`Message sent to ${chatId}: ${message}`);
  } catch (error) {
    console.error(`Failed to send message to ${chatId}:`, error);
  }
}

// Launch the bot
telegramBot.launch().then(() => {
    console.log('Telegram bot is running.');
});

// Example usage of notifyTelegram
// (You can call this function from other parts of your application)
// notifyTelegram('This is a test message.');

// Enable graceful stop
process.once('SIGINT', () => telegramBot.stop('SIGINT'));
process.once('SIGTERM', () => telegramBot.stop('SIGTERM'));

export { notifyTelegram };

const JUPITER_API = 'https://quote-api.jup.ag/v6';

interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;
}

interface JupiterSwapParams {
  quoteResponse: any; // Use a more specific type if you have it
  userPublicKey: string;
}

async function getJupiterQuote(params: JupiterQuoteParams): Promise<any> {
  try {
    const response = await axios.get(`${JUPITER_API}/quote`, {
      params: params,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get Jupiter quote:', error);
    throw error;
  }
}

async function performJupiterSwap(params: JupiterSwapParams): Promise<any> {
  try {
    const response = await axios.post(`${JUPITER_API}/swap`, params);
    return response.data;
  } catch (error) {
    console.error('Failed to perform Jupiter swap:', error);
    throw error;
  }
}

// Example usage (replace with your actual data)
async function exampleJupiterUsage() {
  const quoteParams: JupiterQuoteParams = {
    inputMint: 'So11111111111111111111111111111111111111112', // SOL
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    amount: 1 * 1e9, // 1 SOL (in lamports)
    slippageBps: 50, // 0.5% slippage
  };

  try {
    const quote = await getJupiterQuote(quoteParams);
    console.log('Jupiter Quote:', quote);

    const swapParams: JupiterSwapParams = {
      quoteResponse: quote,
      userPublicKey: 'YOUR_PUBLIC_KEY', // Replace with your public key
    };

    const swapResult = await performJupiterSwap(swapParams);
    console.log('Jupiter Swap Result:', swapResult);
  } catch (error) {
    // Error is already logged in the functions.
  }
}

// exampleJupiterUsage(); // Uncomment to test
export { getJupiterQuote, performJupiterSwap };

const GMGN_API = 'https://gmgn.ai/defi/router/v1/sol/token_analysis';

interface GmgnAnalysisParams {
  token_address: string;
  chain: 'sol';
}

interface GmgnAnalysisResponse {
  liquidity: number;
  smart_trades: number;
  holders: number;
  rug_risk: 'low' | 'medium' | 'high';
}

async function getGmgnAnalysis(params: GmgnAnalysisParams): Promise<GmgnAnalysisResponse> {
  try {
    const response = await axios.get(GMGN_API, {
      params: params,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get GMGN analysis:', error);
    throw error;
  }
}

// Example usage (replace with your actual data)
async function exampleGmgnUsage() {
  const analysisParams: GmgnAnalysisParams = {
    token_address: 'YOUR_TOKEN_ADDRESS', // Replace with your token address
    chain: 'sol',
  };

  try {
    const analysis = await getGmgnAnalysis(analysisParams);
    console.log('GMGN Analysis:', analysis);
  } catch (error) {
    // Error is already logged in the function.
  }
}

// exampleGmgnUsage(); // Uncomment to test
export { getGmgnAnalysis };

const RUGCHECK_API = 'https://api.rugcheck.xyz/v1/check';

interface RugcheckParams {
  token: string;
  chain: 'solana';
}

interface RugcheckResponse {
  risk_score: number;
}

async function checkRugcheck(params: RugcheckParams): Promise<RugcheckResponse> {
  try {
    const response = await axios.get(RUGCHECK_API, {
      params: params,
    });
    return response.data;
  } catch (error) {
    console.error('Rugcheck API request failed:', error);
    throw error;
  }
}

// Example usage (replace with your actual data)
async function exampleRugcheckUsage() {
  const rugcheckParams: RugcheckParams = {
    token: 'YOUR_TOKEN_ADDRESS', // Replace with your token address
    chain: 'solana',
  };

  try {
    const rugcheckResult = await checkRugcheck(rugcheckParams);
    console.log('Rugcheck Result:', rugcheckResult);
  } catch (error) {
    // Error is already logged in the function.
  }
}

// exampleRugcheckUsage(); // Uncomment to test
export { checkRugcheck };

// Replace 'YOUR_BEARER_TOKEN' with your actual bearer token
const bearerToken = 'YOUR_BEARER_TOKEN';

const twitterClient = new TwitterApi(bearerToken);

interface TweetScoutResponse {
  credibilityScore: number;
}

async function checkTweetScout(tweetAuthorId: string): Promise<TweetScoutResponse> {
  try {
    const user = await twitterClient.v2.user(tweetAuthorId, {
      'user.fields': ['public_metrics'],
    });
    const followerCount = user.data.public_metrics?.followers_count || 0;
    const score = Math.min(100, followerCount / 100 + (Math.random() * 20)); // Basic scoring logic
    return { credibilityScore: score };
  } catch (error) {
    console.error('TweetScout API request failed:', error);
    throw error;
  }
}

// Example usage (replace with your actual data)
async function exampleTweetScoutUsage() {
  const tweetAuthorId = 'TWITTER_USER_ID'; // Replace with a Twitter user ID
  try {
    const tweetScoutResult = await checkTweetScout(tweetAuthorId);
    console.log('TweetScout Result:', tweetScoutResult);
  } catch (error) {
    // Error is already logged in the function.
  }
}

// exampleTweetScoutUsage(); // Uncomment to test
export { checkTweetScout };

// Replace with your RPC endpoint
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

// Replace with the program ID you want to listen to logs for
const PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'); // Example: Raydium program ID

// Replace with the specific log string you are looking for.
const LOG_STRING = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2'; // Example: SOL/USDC pool log string.

const connection = new Connection(RPC_ENDPOINT, 'confirmed');

async function subscribeToSolanaLogs() {
  try {
    const subscriptionId = connection.onLogs(
      PROGRAM_ID,
      (logs, commitment) => {
        if (logs.logs.some((log) => log.includes(LOG_STRING))) {
          console.log('Log Event Detected:', logs);
          // Process the logs here
          // You can extract relevant data from the logs object
        }
      },
      'confirmed' // Commitment level: confirmed, finalized, processed
    );

    console.log(`Subscribed to logs with subscription ID: ${subscriptionId}`);

    // To unsubscribe later, you can use:
    // await connection.removeOnLogsListener(subscriptionId);

    // Keep the subscription running (e.g., using setInterval or similar)
    // For this example, we'll keep it running indefinitely
  } catch (error) {
    console.error('Failed to subscribe to Solana logs:', error);
  }
}

subscribeToSolanaLogs();
Explanation:

Imports:
We import Connection and PublicKey from @solana/web3.js.
RPC Endpoint and Program ID:
Replace RPC_ENDPOINT with your Solana RPC endpoint.
Replace PROGRAM_ID with the PublicKey of the program you want to listen to logs for.
Replace LOG_STRING with the string you are searching for within the logs.
Connection Setup:
We create a Connection instance to interact with the Solana blockchain.
subscribeToSolanaLogs Function:
Uses connection.onLogs to subscribe to logs.
Takes three arguments:
PROGRAM_ID: The program ID to listen to logs for.
(logs, commitment) => {...}: A callback function that is called when logs are received.
logs: An object containing the log data.
commitment: The commitment level of the logs.
'confirmed': The commitment level (can be 'confirmed', 'finalized', or 'processed').
Inside the callback:
We check if the logs contain the LOG_STRING using logs.logs.some((log) => log.includes(LOG_STRING)).
If the log string is found, we log the logs object.
You can add your logic to process the logs here.
We log the subscriptionId to the console.
We add a note on how to unsubscribe using connection.removeOnLogsListener(subscriptionId).
We keep the subscription running indefinitely. In a real application, you might use setInterval or a similar mechanism to manage the subscription.
Error Handling:
We include a try...catch block to handle errors during subscription.
Calling the Function:
We call subscribeToSolanaLogs() to start the subscription.
Key Points:

Commitment Level: The commitment level determines how finalized the logs are. 'confirmed' is a good balance between speed and reliability.
Log Processing: You'll need to parse the logs object to extract the data you need. The structure of the logs depends on the program you are listening to.
Unsubscribing: Remember to unsubscribe from the logs when you no longer need them to avoid resource leaks.
Filtering: The LOG_STRING filter is a basic example. You can implement more complex filtering logic based on your requirements.
This example provides a solid foundation for setting up Solana Logs Subscription. Remember to replace the placeholder values with your actual data and adapt the log processing logic to your specific use case.





Could you give me that last code as a text document


TypeScript

import { Connection, PublicKey } from '@solana/web3.js';

// Replace with your RPC endpoint
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

// Replace with the program ID you want to listen to logs for
const PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'); // Example: Raydium program ID

// Replace with the specific log string you are looking for.
const LOG_STRING = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2'; // Example: SOL/USDC pool log string.

const connection = new Connection(RPC_ENDPOINT, 'confirmed');

async function subscribeToSolanaLogs() {
  try {
    const subscriptionId = connection.onLogs(
      PROGRAM_ID,
      (logs, commitment) => {
        if (logs.logs.some((log) => log.includes(LOG_STRING))) {
          console.log('Log Event Detected:', logs);
          // Process the logs here
          // You can extract relevant data from the logs object
        }
      },
      'confirmed' // Commitment level: confirmed, finalized, processed
    );

    console.log(`Subscribed to logs with subscription ID: ${subscriptionId}`);

    // To unsubscribe later, you can use:
    // await connection.removeOnLogsListener(subscriptionId);

    // Keep the subscription running (e.g., using setInterval or similar)
    // For this example, we'll keep it running indefinitely
  } catch (error) {
    console.error('Failed to subscribe to Solana logs:', error);
  }
}

subscribeToSolanaLogs();

interface GasSettings {
  computeUnits: number;
  priorityFee: number;
}

function addComputeBudgetInstructions(
  transaction: Transaction,
  gasSettings: GasSettings
): Transaction {
  // 1. Set Compute Unit Limit
  const setComputeUnitLimitInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: gasSettings.computeUnits,
  });

  // 2. Set Compute Unit Price
  const setComputeUnitPriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: gasSettings.priorityFee,
  });

  // 3. Add Instructions to the Transaction
  transaction.add(setComputeUnitLimitInstruction, setComputeUnitPriceInstruction);

  return transaction;
}

// Example Usage:
function exampleComputeBudgetUsage() {
  const transaction = new Transaction(); // Create a new transaction
  const gasSettings: GasSettings = {
    computeUnits: 200_000, // Example: 200,000 compute units
    priorityFee: 5000, // Example: 5,000 micro-lamports priority fee
  };

  const modifiedTransaction = addComputeBudgetInstructions(transaction, gasSettings);

  console.log('Transaction with compute budget instructions:', modifiedTransaction);
  // You would then add other transaction instructions and sign/send the transaction
}

// exampleComputeBudgetUsage(); // Uncomment to run the example
export { addComputeBudgetInstructions };


// Replace 'YOUR_BEARER_TOKEN' with your actual bearer token
const bearerToken = 'YOUR_BEARER_TOKEN';

const twitterClient = new TwitterApi(bearerToken);

async function setupTwitterStream(keywords: string[]) {
  try {
    // Delete existing rules
    const rules = await twitterClient.v2.getRules();
    if (rules.data && rules.data.length > 0) {
      await twitterClient.v2.updateRules({
        delete: { ids: rules.data.map((rule) => rule.id) },
      });
    }

    // Add new rules
    const newRules = keywords.map((keyword) => ({ value: keyword }));
    await twitterClient.v2.updateRules({ add: newRules });

    // Create the stream
    const stream = twitterClient.v2.searchStream({
      'tweet.fields': ['created_at', 'author_id', 'text'],
      'user.fields': ['username', 'followers_count'],
    });

    // Listen for data
    stream.on('data', (tweet) => {
      console.log('Tweet Received:', tweet);

      // Access tweet data
      const tweetText = tweet.data.text;
      const authorId = tweet.data.author_id;
      const createdAt = tweet.data.created_at;

      // Access user data (if included in the tweet)
      const user = tweet.includes?.users?.find((u) => u.id === authorId);
      const username = user?.username;
      const followers = user?.followers_count;

      console.log(`\nTweet: ${tweetText}`);
      console.log(`Author: @${username} (Followers: ${followers})`);
      console.log(`Created At: ${createdAt}`);

      // Add your custom processing logic here (e.g., keyword filtering, data extraction)
    });

    // Handle stream errors
    stream.on('error', (error) => {
      console.error('Stream Error:', error);
    });

    // Handle stream closure
    stream.on('close', () => {
      console.log('Stream Closed.');
    });

    // Handle stream reconnection
    stream.on('reconnect', () => {
      console.log('Stream Reconnecting...');
    });

    // Connect the stream
    await stream.connect({ autoReconnect: true });
    console.log('Twitter Stream Connected.');

  } catch (error) {
    console.error('Error setting up Twitter stream:', error);
  }
}

// Example usage
const keywordsToTrack = ['SOL', 'memecoin', 'CA'];
setupTwitterStream(keywordsToTrack).catch(console.error);

// Function to read data from a file
async function readFileData(filePath: string): Promise<string | null> {
  try {
    const absolutePath = path.resolve(filePath); // Resolve to absolute path
    const data = await fs.readFile(absolutePath, 'utf-8');
    return data;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

// Function to write data to a file
async function writeFileData(filePath: string, data: string): Promise<void> {
  try {
    const absolutePath = path.resolve(filePath); // Resolve to absolute path
    await fs.writeFile(absolutePath, data, 'utf-8');
    console.log(`Data written to ${filePath}`);
  } catch (error) {
    console.error(`Error writing to file ${filePath}:`, error);
  }
}

// Function to append data to a file
async function appendFileData(filePath: string, data: string): Promise<void> {
  try {
    const absolutePath = path.resolve(filePath); // Resolve to absolute path
    await fs.appendFile(absolutePath, data, 'utf-8');
    console.log(`Data appended to ${filePath}`);
  } catch (error) {
    console.error(`Error appending to file ${filePath}:`, error);
  }
}

// Function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const absolutePath = path.resolve(filePath); // Resolve to absolute path
    await fs.access(absolutePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

// Example Usage:
async function exampleFileSystemUsage() {
  const filePath = 'data.txt'; // Relative or absolute path

  // Write data to file
  await writeFileData(filePath, 'Hello, file system!');

  // Append data to file
  await appendFileData(filePath, '\nThis is appended data.');

  // Read data from file
  const fileContent = await readFileData(filePath);
  if (fileContent !== null) {
    console.log('File Content:', fileContent);
  }

  // Check if file exists
  const exists = await fileExists(filePath);
  console.log(`File ${filePath} exists: ${exists}`);
}

// exampleFileSystemUsage(); // Uncomment to run the example
export { readFileData, writeFileData, appendFileData, fileExists };

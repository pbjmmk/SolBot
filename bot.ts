import { TwitterApi, StreamingV2Params } from 'twitter-api-v2';
import { Telegraf } from 'telegraf';
import axios from 'axios';

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


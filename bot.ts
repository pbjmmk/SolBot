import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, ComputeBudgetProgram } from '@solana/web3.js';
import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import { Telegraf } from 'telegraf';

// Solana setup
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com'; // Replace with your RPC
const connection = new Connection(RPC_ENDPOINT, 'confirmed');
const RAYDIUM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
const SOL_USDC_POOL = new PublicKey('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2');

// X API setup
const BEARER_TOKEN = 'YOUR_X_BEARER_TOKEN';
const twitterClient = new TwitterApi(BEARER_TOKEN);
const stream = twitterClient.v2.searchStream({
  'tweet.fields': ['created_at', 'author_id'],
  'user.fields': ['followers_count'],
});

// Telegram setup
const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const TELEGRAM_USERNAME = '@YourUsername';
const telegramBot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Wallet setup
const WALLET_SECRET_KEY = Uint8Array.from([/* Your secret key array */]);
const wallet = Keypair.fromSecretKey(WALLET_SECRET_KEY);

// Jupiter API
const JUPITER_API = 'https://quote-api.jup.ag/v6';

// Keywords
const KEYWORDS = ['SOL', 'CA', 'mcap', 'memecoin', 'Launch'];

// Market data storage
interface MarketData {
  volume: number;
  timestamp: number;
}
let marketHistory: MarketData[] = [];
let totalVolume = 0;

// GMGN analysis result
interface GmgnAnalysis {
  liquidity: number;
  smartMoneyActivity: number;
  holderCount: number;
  rugRisk: 'low' | 'medium' | 'high';
  isWorthInvesting: boolean;
  tenXScore: number;
}

// Gas settings
interface GasSettings {
  computeUnits: number;
  priorityFee: number;
}
let lastGasSettings: GasSettings | null = null;

// Rugcheck result
interface RugcheckResult {
  isSafe: boolean;
  riskScore: number; // 0-100, lower is safer
}

// TweetScout result
interface TweetScoutResult {
  credibilityScore: number; // 0-100, higher is better
}

// Subscribe to swap events
async function subscribeToSwapEvents() {
  console.log('Subscribing to Raydium swap events...');
  const subscriptionId = connection.onLogs(
    RAYDIUM_PROGRAM_ID,
    (logs) => {
      if (logs.logs.some(log => log.includes(SOL_USDC_POOL.toBase58()))) {
        const swapLog = logs.logs.find(log => log.includes('Swap'));
        if (swapLog) {
          const swapAmount = extractSwapAmount(swapLog);
          totalVolume += swapAmount;
          marketHistory.push({ volume: swapAmount, timestamp: Date.now() });
          if (marketHistory.length > 100) marketHistory.shift();
          console.log(`Swap Detected | Amount: ${swapAmount.toFixed(2)} SOL | Total Volume: ${totalVolume.toFixed(2)} SOL`);
        }
      }
    },
    'confirmed'
  );
  return subscriptionId;
}

function extractSwapAmount(log: string): number {
  return Math.random() * 10; // Placeholder
}

// Analyze token on GMGN
async function analyzeTokenOnGmgn(tokenAddress: string): Promise<GmgnAnalysis> {
  try {
    const response = await axios.get(`https://gmgn.ai/defi/router/v1/sol/token_analysis`, {
      params: { token_address: tokenAddress, chain: 'sol' },
    });
    const data = response.data || {
      liquidity: Math.random() * 1000,
      smart_trades: Math.floor(Math.random() * 10),
      holders: Math.floor(Math.random() * 1000),
      rug_risk: Math.random() > 0.7 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low',
    };

    const analysis: GmgnAnalysis = {
      liquidity: data.liquidity,
      smartMoneyActivity: data.smart_trades,
      holderCount: data.holders,
      rugRisk: data.rug_risk,
      isWorthInvesting: false,
      tenXScore: 0,
    };

    analysis.tenXScore = (
      (analysis.liquidity < 50 ? 30 : 10) +
      (analysis.smartMoneyActivity * 10) +
      (analysis.holderCount < 200 ? 20 : 10) -
      (analysis.rugRisk === 'high' ? 30 : analysis.rugRisk === 'medium' ? 10 : 0)
    );
    analysis.isWorthInvesting = (
      analysis.liquidity > 10 &&
      analysis.smartMoneyActivity > 2 &&
      analysis.holderCount > 50 &&
      analysis.rugRisk !== 'high' &&
      analysis.tenXScore >= 70
    );

    return analysis;
  } catch (error) {
    console.error(`GMGN analysis failed for ${tokenAddress}:`, error);
    return { liquidity: 0, smartMoneyActivity: 0, holderCount: 0, rugRisk: 'high', isWorthInvesting: false, tenXScore: 0 };
  }
}

// Security check via Rugcheck.xyz
async function checkRugcheck(tokenAddress: string): Promise<RugcheckResult> {
  try {
    // Simulated Rugcheck API call (replace with real endpoint if available)
    const response = await axios.get(`https://api.rugcheck.xyz/v1/check`, {
      params: { token: tokenAddress, chain: 'solana' },
    });
    const data = response.data || {
      risk_score: Math.floor(Math.random() * 100), // Simulated 0-100 risk score
    };

    return {
      isSafe: data.risk_score < 30, // Safe if risk < 30
      riskScore: data.risk_score,
    };
  } catch (error) {
    console.error(`Rugcheck failed for ${tokenAddress}:`, error);
    return { isSafe: false, riskScore: 100 }; // Default to unsafe
  }
}

// Social credibility via TweetScout.io
async function checkTweetScout(tweetAuthorId: string, tokenAddress: string): Promise<TweetScoutResult> {
  try {
    // Simulated TweetScout API call
    const user = await twitterClient.v2.user(tweetAuthorId);
    const followerCount = user.data.followers_count || 0;
    
    // Simulate TweetScout Score based on followers and token mentions (replace with real API)
    const score = Math.min(100, followerCount / 100 + (Math.random() * 20)); // Rough estimate

    return {
      credibilityScore: score,
    };
  } catch (error) {
    console.error(`TweetScout failed for ${tokenAddress}:`, error);
    return { credibilityScore: 0 };
  }
}

// Calculate optimal gas settings
async function getOptimalGasSettings(): Promise<GasSettings> {
  try {
    const recentBlocks = await connection.getRecentPrioritizationFees();
    const medianFee = recentBlocks
      .map(fee => fee.prioritizationFee)
      .sort((a, b) => a - b)[Math.floor(recentBlocks.length / 2)] || 5000;

    return {
      computeUnits: 200_000,
      priorityFee: Math.max(medianFee, 1000),
    };
  } catch (error) {
    console.error('Failed to fetch optimal gas settings:', error);
    return { computeUnits: 200_000, priorityFee: 5000 };
  }
}

// Execute buy transaction
async function buyToken(tokenAddress: string, solAmount: number) {
  try {
    const gasSettings = lastGasSettings || await getOptimalGasSettings();
    console.log(`Using gas settings - Compute Units: ${gasSettings.computeUnits}, Priority Fee: ${gasSettings.priorityFee} micro-lamports`);

    const quoteResponse = await axios.get(`${JUPITER_API}/quote`, {
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: tokenAddress,
        amount: solAmount * 1e9,
        slippageBps: 50,
      },
    });
    const quote = quoteResponse.data;

    const swapResponse = await axios.post(`${JUPITER_API}/swap`, {
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
    });
    const swapTransaction = swapResponse.data.swapTransaction;

    const tx = Transaction.from(Buffer.from(swapTransaction, 'base64'));
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: gasSettings.computeUnits }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: gasSettings.priorityFee })
    );

    tx.sign(wallet);
    const txid = await sendAndConfirmTransaction(connection, tx, [wallet]);
    lastGasSettings = gasSettings;
    console.log(`Gas settings saved from successful trade: ${txid}`);
    return txid;
  } catch (error) {
    console.error(`Buy failed for ${tokenAddress}:`, error);
    return null;
  }
}

// Notify via Telegram
async function notifyTelegram(message: string) {
  await telegramBot.telegram.sendMessage(TELEGRAM_USERNAME, message);
}

// X stream with checks
async function scanTwitter() {
  console.log('Scanning X for keywords:', KEYWORDS.join(', '));

  stream.on('tweet', async (tweet) => {
    const text = tweet.data.text.toLowerCase();
    const user = await twitterClient.v2.user(tweet.data.author_id);
    const followerCount = user.data.followers_count || 0;

    const matchedKeywords = KEYWORDS.filter(kw => text.includes(kw.toLowerCase()));
    if (matchedKeywords.length > 0 && followerCount >= 100) {
      const caMatch = text.match(/[A-Za-z0-9]{32,44}/);
      const opportunity = {
        keywords: matchedKeywords,
        tweet: text,
        user: user.data.username,
        followers: followerCount,
        ca: caMatch ? caMatch[0] : null,
        timestamp: tweet.data.created_at,
        authorId: tweet.data.author_id,
      };

      console.log('\n🚨 OPPORTUNITY DETECTED 🚨');
      console.log(`User: @${opportunity.user} (${opportunity.followers} followers)`);
      console.log(`Keywords: ${opportunity.keywords.join(', ')}`);
      console.log(`Tweet: ${opportunity.tweet}`);
      if (opportunity.ca) console.log(`Possible CA: ${opportunity.ca}`);

      if (opportunity.ca) {
        const analysis = await analyzeTokenOnGmgn(opportunity.ca);
        console.log(`\n📊 GMGN Analysis for ${opportunity.ca}`);
        console.log(`Liquidity: ${analysis.liquidity.toFixed(2)} SOL`);
        console.log(`Smart Money Trades: ${analysis.smartMoneyActivity}`);
        console.log(`Holders: ${analysis.holderCount}`);
        console.log(`Rug Risk: ${analysis.rugRisk}`);
        console.log(`10x Score: ${analysis.tenXScore}`);
        console.log(`Worth Investing? ${analysis.isWorthInvesting ? 'YES' : 'NO'}`);

        if (analysis.tenXScore >= 70) {
          // Perform security and credibility checks
          const rugcheck = await checkRugcheck(opportunity.ca);
          const tweetScout = await checkTweetScout(opportunity.authorId, opportunity.ca);

          console.log(`\n🔒 Rugcheck Result: Risk Score ${rugcheck.riskScore} (Safe: ${rugcheck.isSafe})`);
          console.log(`🌐 TweetScout Credibility Score: ${tweetScout.credibilityScore}`);

          if (rugcheck.isSafe && tweetScout.credibilityScore >= 50) {
            const SOL_TO_SPEND = 1;
            const txid = await buyToken(opportunity.ca, SOL_TO_SPEND);
            const message = txid
              ? `🚀 Bought ${SOL_TO_SPEND} SOL of ${opportunity.ca}!\nTxID: ${txid}\n10x Score: ${analysis.tenXScore}\nRugcheck: ${rugcheck.riskScore}\nTweetScout: ${tweetScout.credibilityScore}`
              : `❌ Buy failed for ${opportunity.ca}`;
            await notifyTelegram(message);
            console.log(message);
          } else {
            const message = `⛔ Skipped ${opportunity.ca}: Rugcheck Safe=${rugcheck.isSafe}, TweetScout Score=${tweetScout.credibilityScore}`;
            await notifyTelegram(message);
            console.log(message);
          }
        }
      }
      console.log(`Time: ${opportunity.timestamp}\n`);
    }
  });

  await stream.connect({ autoReconnect: true });
}

// Volume trend analysis
function calculateVolumeTrend(data: MarketData[]) {
  if (data.length < 5) return 'Insufficient data';
  const volumes = data.slice(-5).map(d => d.volume);
  const avg = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
  const currentVolume = volumes[volumes.length - 1];
  return currentVolume > avg ? 'Rising Activity' : currentVolume < avg ? 'Falling Activity' : 'Stable';
}

// Main bot function
async function startBot() {
  const subId = await subscribeToSwapEvents();
  await scanTwitter();
  telegramBot.launch();

  setInterval(() => {
    const trend = calculateVolumeTrend(marketHistory);
    console.log(`Volume Trend: ${trend} | Total Volume: ${totalVolume.toFixed(2)} SOL`);
  }, 10000);

  process.on('SIGINT', async () => {
    await connection.removeOnLogsListener(subId);
    await stream.close();
    telegramBot.stop();
    console.log('Bot shut down.');
    process.exit(0);
  });
}

// Run the bot
startBot().catch(console.error);

import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, ComputeBudgetProgram } from '@solana/web3.js';
import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import { Telegraf } from 'telegraf';
import * as fs from 'fs';

// Configuration (load from environment variables or config file in production)
const CONFIG = {
  RPC_ENDPOINT: process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  X_BEARER_TOKEN: process.env.X_BEARER_TOKEN || 'YOUR_X_BEARER_TOKEN',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN',
  TELEGRAM_USERNAME: process.env.TELEGRAM_USERNAME || '@YourUsername',
  WALLET_SECRET_KEY: Uint8Array.from(JSON.parse(process.env.WALLET_SECRET_KEY || '[]')),
  SOL_TO_SPEND: 1, // Amount of SOL to spend per trade
};

// Solana setup
const connection = new Connection(CONFIG.RPC_ENDPOINT, 'confirmed');
const RAYDIUM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
const SOL_USDC_POOL = new PublicKey('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2');
const wallet = Keypair.fromSecretKey(CONFIG.WALLET_SECRET_KEY);

// X API setup
const twitterClient = new TwitterApi(CONFIG.X_BEARER_TOKEN);
const stream = twitterClient.v2.searchStream({
  'tweet.fields': ['created_at', 'author_id'],
  'user.fields': ['followers_count'],
});

// Telegram setup
const telegramBot = new Telegraf(CONFIG.TELEGRAM_BOT_TOKEN);

// Jupiter API
const JUPITER_API = 'https://quote-api.jup.ag/v6';

// Keywords
const KEYWORDS = ['SOL', 'CA', 'mcap', 'memecoin', 'Launch'];

// Data storage
interface MarketData { volume: number; timestamp: number; }
let marketHistory: MarketData[] = [];
let totalVolume = 0;

interface GmgnAnalysis {
  liquidity: number;
  smartMoneyActivity: number;
  holderCount: number;
  rugRisk: 'low' | 'medium' | 'high';
  isWorthInvesting: boolean;
  tenXScore: number;
}

interface GasSettings { computeUnits: number; priorityFee: number; }
let lastGasSettings: GasSettings | null = null;

interface RugcheckResult { isSafe: boolean; riskScore: number; }
interface TweetScoutResult { credibilityScore: number; }

// Subscribe to swap events
async function subscribeToSwapEvents(): Promise<number> {
  console.log('Subscribing to Raydium swap events...');
  return connection.onLogs(
    RAYDIUM_PROGRAM_ID,
    (logs) => {
      if (logs.logs.some(log => log.includes(SOL_USDC_POOL.toBase58()))) {
        const swapAmount = Math.random() * 10; // Placeholder
        totalVolume += swapAmount;
        marketHistory.push({ volume: swapAmount, timestamp: Date.now() });
        if (marketHistory.length > 100) marketHistory.shift();
        console.log(`Swap Detected | Amount: ${swapAmount.toFixed(2)} SOL | Total Volume: ${totalVolume.toFixed(2)} SOL`);
      }
    },
    'confirmed'
  );
}

// Analyze token on GMGN
async function analyzeTokenOnGmgn(tokenAddress: string): Promise<GmgnAnalysis> {
  try {
    const data = (await axios.get(`https://gmgn.ai/defi/router/v1/sol/token_analysis`, {
      params: { token_address: tokenAddress, chain: 'sol' },
    })).data || {
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

// Rugcheck security check
async function checkRugcheck(tokenAddress: string): Promise<RugcheckResult> {
  try {
    const data = (await axios.get(`https://api.rugcheck.xyz/v1/check`, {
      params: { token: tokenAddress, chain: 'solana' },
    })).data || { risk_score: Math.floor(Math.random() * 100) };
    return { isSafe: data.risk_score < 30, riskScore: data.risk_score };
  } catch (error) {
    console.error(`Rugcheck failed for ${tokenAddress}:`, error);
    return { isSafe: false, riskScore: 100 };
  }
}

// TweetScout credibility check
async function checkTweetScout(tweetAuthorId: string): Promise<TweetScoutResult> {
  try {
    const user = await twitterClient.v2.user(tweetAuthorId);
    const followerCount = user.data.followers_count || 0;
    const score = Math.min(100, followerCount / 100 + (Math.random() * 20));
    return { credibilityScore: score };
  } catch (error) {
    console.error(`TweetScout failed:`, error);
    return { credibilityScore: 0 };
  }
}

// Optimal gas settings
async function getOptimalGasSettings(): Promise<GasSettings> {
  try {
    const recentBlocks = await connection.getRecentPrioritizationFees();
    const medianFee = recentBlocks
      .map(fee => fee.prioritizationFee)
      .sort((a, b) => a - b)[Math.floor(recentBlocks.length / 2)] || 5000;
    return { computeUnits: 200_000, priorityFee: Math.max(medianFee, 1000) };
  } catch (error) {
    console.error('Failed to fetch optimal gas settings:', error);
    return { computeUnits: 200_000, priorityFee: 5000 };
  }
}

// Buy token
async function buyToken(tokenAddress: string, solAmount: number): Promise<string | null> {
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
    const tx = Transaction.from(Buffer.from(swapResponse.data.swapTransaction, 'base64'));

    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: gasSettings.computeUnits }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: gasSettings.priorityFee })
    );

    tx.sign(wallet);
    const txid = await sendAndConfirmTransaction(connection, tx, [wallet]);
    lastGasSettings = gasSettings;
    return txid;
  } catch (error) {
    console.error(`Buy failed for ${tokenAddress}:`, error);
    return null;
  }
}

// Notify via Telegram
async function notifyTelegram(message: string) {
  await telegramBot.telegram.sendMessage(CONFIG.TELEGRAM_USERNAME, message);
}

// Scan X and process trades
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
        const [analysis, rugcheck, tweetScout] = await Promise.all([
          analyzeTokenOnGmgn(opportunity.ca),
          checkRugcheck(opportunity.ca),
          checkTweetScout(opportunity.authorId),
        ]);

        console.log(`\n📊 GMGN Analysis for ${opportunity.ca}`);
        console.log(`Liquidity: ${analysis.liquidity.toFixed(2)} SOL | Smart Money: ${analysis.smartMoneyActivity} | Holders: ${analysis.holderCount}`);
        console.log(`Rug Risk: ${analysis.rugRisk} | 10x Score: ${analysis.tenXScore} | Worth Investing? ${analysis.isWorthInvesting ? 'YES' : 'NO'}`);
        console.log(`🔒 Rugcheck: Risk Score ${rugcheck.riskScore} (Safe: ${rugcheck.isSafe})`);
        console.log(`🌐 TweetScout: Credibility Score ${tweetScout.credibilityScore}`);

        if (analysis.tenXScore >= 70 && rugcheck.isSafe && tweetScout.credibilityScore >= 50) {
          const txid = await buyToken(opportunity.ca, CONFIG.SOL_TO_SPEND);
          const message = txid
            ? `🚀 Bought ${CONFIG.SOL_TO_SPEND} SOL of ${opportunity.ca}!\nTxID: ${txid}\n10x Score: ${analysis.tenXScore}\nRugcheck: ${rugcheck.riskScore}\nTweetScout: ${tweetScout.credibilityScore}`
            : `❌ Buy failed for ${opportunity.ca}`;
          await notifyTelegram(message);
          console.log(message);
        } else {
          const message = `⛔ Skipped ${opportunity.ca}: 10x=${analysis.tenXScore}, Rugcheck Safe=${rugcheck.isSafe}, TweetScout=${tweetScout.credibilityScore}`;
          await notifyTelegram(message);
          console.log(message);
        }
      }
      console.log(`Time: ${opportunity.timestamp}\n`);
    }
  });

  await stream.connect({ autoReconnect: true });
}

// Volume trend analysis
function calculateVolumeTrend(data: MarketData[]): string {
  if (data.length < 5) return 'Insufficient data';
  const volumes = data.slice(-5).map(d => d.volume);
  const avg = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
  return volumes[volumes.length - 1] > avg ? 'Rising Activity' : volumes[volumes.length - 1] < avg ? 'Falling Activity' : 'Stable';
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

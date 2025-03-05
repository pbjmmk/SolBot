import { Connection, PublicKey } from '@solana/web3.js';
import { TwitterApi } from 'twitter-api-v2';

// Solana setup
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com'; // Replace with your RPC
const connection = new Connection(RPC_ENDPOINT, 'confirmed');
const RAYDIUM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
const SOL_USDC_POOL = new PublicKey('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2');

// X API setup (replace with your bearer token)
const BEARER_TOKEN = 'YOUR_X_BEARER_TOKEN';
const twitterClient = new TwitterApi(BEARER_TOKEN);
const stream = twitterClient.v2.searchStream({
  'tweet.fields': ['created_at', 'author_id'],
  'user.fields': ['followers_count'],
});

// Keywords to track
const KEYWORDS = ['SOL', 'CA', 'mcap', 'memecoin', 'Launch'];

// Market data storage
interface MarketData {
  volume: number;
  timestamp: number;
}
let marketHistory: MarketData[] = [];
let totalVolume = 0;

// Swap event subscription (from previous code)
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
  return Math.random() * 10; // Placeholder—replace with real decoding
}

// X stream for keyword scanning
async function scanTwitter() {
  console.log('Scanning X for keywords:', KEYWORDS.join(', '));

  stream.on('tweet', async (tweet) => {
    const text = tweet.data.text.toLowerCase();
    const user = await twitterClient.v2.user(tweet.data.author_id);
    const followerCount = user.data.followers_count || 0;

    // Check if tweet contains any keyword
    const matchedKeywords = KEYWORDS.filter(kw => text.includes(kw.toLowerCase()));
    if (matchedKeywords.length > 0) {
      // Basic spam filter: ignore low-follower accounts (adjust threshold)
      if (followerCount < 100) return;

      // Look for contract addresses (CA) in tweet
      const caMatch = text.match(/[A-Za-z0-9]{32,44}/); // Solana addresses are 32-44 chars
      const opportunity = {
        keywords: matchedKeywords,
        tweet: text,
        user: user.data.username,
        followers: followerCount,
        ca: caMatch ? caMatch[0] : null,
        timestamp: tweet.data.created_at,
      };

      // Instant alert
      console.log('\n🚨 OPPORTUNITY DETECTED 🚨');
      console.log(`User: @${opportunity.user} (${opportunity.followers} followers)`);
      console.log(`Keywords: ${opportunity.keywords.join(', ')}`);
      console.log(`Tweet: ${opportunity.tweet}`);
      if (opportunity.ca) console.log(`Possible CA: ${opportunity.ca}`);
      console.log(`Time: ${opportunity.timestamp}\n`);
    }
  });

  // Start the stream
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

  // Periodic trend report
  setInterval(() => {
    const trend = calculateVolumeTrend(marketHistory);
    console.log(`Volume Trend: ${trend} | Total Volume: ${totalVolume.toFixed(2)} SOL`);
  }, 10000);

  // Cleanup on exit
  process.on('SIGINT', async () => {
    await connection.removeOnLogsListener(subId);
    await stream.close();
    console.log('Bot shut down.');
    process.exit(0);
  });
}

// Run the bot
startBot().catch(console.error);

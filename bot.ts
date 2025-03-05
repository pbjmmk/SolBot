import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import { Telegraf } from 'telegraf';

// Solana setup
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com'; // Replace with your RPC
const connection = new Connection(RPC_ENDPOINT, 'confirmed');
const RAYDIUM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
const SOL_USDC_POOL = new PublicKey('58oQChx

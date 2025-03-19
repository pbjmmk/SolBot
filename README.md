#MySolana Public Key
44oNEkvsEaZfbTXG4mARobdn4bpk3NdSDbrQa5hXFiCg





# Solana Trading Bot with X and Telegram Notifications

This project is a Node.js-based trading bot that monitors X (formerly Twitter) for potential Solana token opportunities, analyzes them, and executes trades based on predefined criteria. It also provides notifications via Telegram.

## Prerequisites

* **Node.js and npm:** Ensure you have Node.js and npm (Node Package Manager) installed on your system.
* **Solana Wallet:** You'll need a Solana wallet with sufficient SOL to execute trades.
* **X API Bearer Token:** Obtain an X API Bearer Token from the X Developer Portal.
* **Telegram Bot Token:** Create a Telegram bot and obtain its API token from BotFather.
* **`.env` File:** Create a `.env` file in your project's root directory to store your sensitive information.

## Setup

1.  **Install Dependencies:**

    ```bash
    npm install @solana/web3.js twitter-api-v2 axios telegraf dotenv bs58
    ```

2.  **Configure `.env` File:**

    Create a `.env` file in the root directory of your project and add the following variables:

    ```
    RPC_ENDPOINT=[https://api.mainnet-beta.solana.com](https://api.mainnet-beta.solana.com) # Or your preferred Solana RPC endpoint
    X_BEARER_TOKEN=YOUR_X_BEARER_TOKEN
    TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
    TELEGRAM_USERNAME=@YourTelegramUsername
    WALLET_SECRET_KEY=Your_Solana_Wallet_Secret_Key_JSON_Array #JSON Array of your secret key.
    SOL_TO_SPEND=1 # Amount of SOL to spend per trade
    ```

    * **`RPC_ENDPOINT`:** The Solana RPC endpoint to connect to.
    * **`X_BEARER_TOKEN`:** Your X API Bearer Token.
    * **`TELEGRAM_BOT_TOKEN`:** Your Telegram bot's API token.
    * **`TELEGRAM_USERNAME`:** Your Telegram username (e.g., `@YourUsername`).
    * **`WALLET_SECRET_KEY`:** Your Solana wallet's secret key as a JSON array of numbers. You must convert your base 58 private key to a JSON array. See the previous instructions on how to do this.
    * **`SOL_TO_SPEND`:** The amount of SOL you want to spend per trade.

    **Important:** Never commit your `.env` file to version control. Add it to your `.gitignore` file.

    3.**Run the converter**

    node skc.js

4.  **Run the Bot:**

    ```bash
    node <your-main-script-file>.js # example: node index.js
    ```

    The bot will start scanning X for keywords, analyzing potential trades, and sending notifications to your Telegram account.

## Important Considerations

* **Security:**
    * Protect your `.env` file and never share your secret key.
    * Be cautious when using online tools or scripts.
    * Never expose your secret key in client side code.
* **Risk:**
    * Trading cryptocurrencies involves significant risk.
    * This bot is provided as-is, and you are responsible for any losses incurred.
    * Test thoroughly with small amounts before trading with significant funds.
* **API Limits:**
    * Be aware of API rate limits for X and other services.
* **Error Handling:**
    * The code includes basic error handling, but you may need to add more robust error handling for production use.
* **Dependencies:**
    * This code relies on the Jupiter API, GMGN api, and Rugcheck API. Ensure those APIs are stable.
    * The code also relies on the raydium program ID, and the SOL/USDC pool ID. If those ID's change, the code will no longer function correctly.

## Disclaimer

This software is provided "as is," without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

require('dotenv').config();
const bs58 = require('bs58');

function convertSecretKeyToJsonArray() {
  const secretKeyBase58 = process.env.SOLANA_SECRET_KEY_BASE58;

  if (!secretKeyBase58) {
    console.error('SOLANA_SECRET_KEY_BASE58 not found in .env');
    return;
  }

  try {
    const secretKeyUint8Array = bs58.decode(secretKeyBase58);
    const jsonArray = `[${secretKeyUint8Array.join(',')}]`;

    // Set the JSON array as a new environment variable
    process.env.SOLANA_SECRET_KEY_JSON_ARRAY = jsonArray;
  } catch (error) {
    console.error('Error converting secret key:', error);
  }
}

// Execute the conversion
convertSecretKeyToJsonArray();

// Now you can access the JSON array from process.env.SOLANA_SECRET_KEY_JSON_ARRAY
// For example, if you needed to use it in another part of your application.
// let mySecretArray = JSON.parse(process.env.SOLANA_SECRET_KEY_JSON_ARRAY);

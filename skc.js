const bs58 = require('bs58');

function secretKeyToJsonArray(secretKeyBase58) {
  try {
    const secretKeyUint8Array = bs58.decode(secretKeyBase58);
    const jsonArray = `[${secretKeyUint8Array.join(',')}]`;
    return jsonArray;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Example usage (replace with your actual secret key)
const mySecretKeyBase58 = 'Your_Secret_Key_Here';
const jsonArray = secretKeyToJsonArray(mySecretKeyBase58);

if (jsonArray) {
  console.log(jsonArray);
}

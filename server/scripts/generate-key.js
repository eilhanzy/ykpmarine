const crypto = require('crypto');

const rawKey = `ykp_${crypto.randomBytes(24).toString('hex')}`;
const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

console.log('API Key:', rawKey);
console.log('SHA-256:', hash);
console.log('WHITELIST_KEY_HASHES=', hash);

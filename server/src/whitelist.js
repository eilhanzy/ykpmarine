const parseList = (value) =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const whitelistKeys = parseList(process.env.WHITELIST_KEYS);
const whitelistIps = parseList(process.env.WHITELIST_IPS);

const extractKey = (req) => {
  const headerKey = req.get('x-api-key');
  if (headerKey) {
    return headerKey.trim();
  }
  const auth = req.get('authorization');
  if (!auth) {
    return '';
  }
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
};

const isWhitelisted = (req) => {
  if (whitelistKeys.length === 0 && whitelistIps.length === 0) {
    return false;
  }

  const key = extractKey(req);
  if (key && whitelistKeys.includes(key)) {
    return true;
  }

  if (whitelistIps.length > 0) {
    const requestIp = req.ip;
    if (whitelistIps.includes(requestIp)) {
      return true;
    }
  }

  return false;
};

const requireWhitelist = (req, res, next) => {
  if (isWhitelisted(req)) {
    next();
    return;
  }

  res.status(403).json({
    error: 'Yetkisiz erisim. Whitelist disi istegi engellendi.',
  });
};

module.exports = {
  requireWhitelist,
  isWhitelisted,
};

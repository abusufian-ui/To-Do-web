// Central, fail-fast secret loader. No insecure literal fallbacks.
// Accepts JWT_SECRET (preferred) or the legacy REACT_APP_JWT_SECRET name so
// existing deployments keep working after this change — but refuses to start
// if neither is present or the value is too weak to sign auth tokens with.
const JWT_SECRET = process.env.JWT_SECRET || process.env.REACT_APP_JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'FATAL: JWT_SECRET (or REACT_APP_JWT_SECRET) must be set and be at least 32 characters. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"'
  );
}

const JWT_ALG = 'HS256';

module.exports = { JWT_SECRET, JWT_ALG };

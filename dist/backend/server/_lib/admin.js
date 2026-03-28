const { getBearerToken, verifyToken } = require("./auth");

function requireAdmin(req) {
  const token = getBearerToken(req);
  const payload = verifyToken(token);
  if (!payload) return null;
  return payload;
}

module.exports = { requireAdmin };

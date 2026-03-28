const crypto = require("crypto");

const TOKEN_EXPIRES_SEC = 60 * 60 * 24 * 7; // 7 days

function b64urlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function getSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error("Missing ADMIN_JWT_SECRET");
  return secret;
}

function signAdminToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    role: "admin",
    iat: now,
    exp: now + TOKEN_EXPIRES_SEC,
  };

  const encodedHeader = b64urlEncode(JSON.stringify(header));
  const encodedBody = b64urlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;
  const sig = crypto.createHmac("sha256", getSecret()).update(data).digest("base64");
  const encodedSig = sig.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${encodedSig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac("sha256", getSecret()).update(data).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (expected !== s) return null;

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(p));
  } catch (e) {
    return null;
  }
  if (!payload || payload.role !== "admin") return null;
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice("Bearer ".length).trim();
}

module.exports = {
  signAdminToken,
  verifyToken,
  getBearerToken,
};

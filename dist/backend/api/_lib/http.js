function normalizeCorsAllowlist(raw) {
  if (!raw || String(raw).trim() === "" || String(raw).trim() === "*") return null;
  return String(raw)
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const CORS_ALLOWLIST = normalizeCorsAllowlist(process.env.CORS_ORIGIN);

function resolveCorsOrigin(req) {
  if (!CORS_ALLOWLIST) return "*";
  const origin = req && req.headers && req.headers.origin;
  if (origin && CORS_ALLOWLIST.includes(origin)) return origin;
  if (origin && !CORS_ALLOWLIST.includes(origin)) return CORS_ALLOWLIST[0];
  return CORS_ALLOWLIST[0] || "*";
}

function setCors(req, res) {
  const allow = resolveCorsOrigin(req);
  res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function send(req, res, status, payload) {
  setCors(req, res);
  res.status(status).json(payload);
}

function ok(req, res, payload) {
  send(req, res, 200, payload);
}

function badRequest(req, res, message) {
  send(req, res, 400, { error: message || "Bad request" });
}

function unauthorized(req, res, message) {
  send(req, res, 401, { error: message || "Unauthorized" });
}

function forbidden(req, res, message) {
  send(req, res, 403, { error: message || "Forbidden" });
}

function methodNotAllowed(req, res) {
  send(req, res, 405, { error: "Method not allowed" });
}

function serverError(req, res, error) {
  send(req, res, 500, { error: "Server error", detail: String(error && error.message ? error.message : error) });
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function handleOptions(req, res) {
  if (req.method !== "OPTIONS") return false;
  setCors(req, res);
  res.status(204).end();
  return true;
}

module.exports = {
  setCors,
  send,
  ok,
  badRequest,
  unauthorized,
  forbidden,
  methodNotAllowed,
  serverError,
  readJson,
  handleOptions,
};

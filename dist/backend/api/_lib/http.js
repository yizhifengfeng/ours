const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "*";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function send(res, status, payload) {
  setCors(res);
  res.status(status).json(payload);
}

function ok(res, payload) {
  send(res, 200, payload);
}

function badRequest(res, message) {
  send(res, 400, { error: message || "Bad request" });
}

function unauthorized(res, message) {
  send(res, 401, { error: message || "Unauthorized" });
}

function forbidden(res, message) {
  send(res, 403, { error: message || "Forbidden" });
}

function methodNotAllowed(res) {
  send(res, 405, { error: "Method not allowed" });
}

function serverError(res, error) {
  send(res, 500, { error: "Server error", detail: String(error && error.message ? error.message : error) });
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
  setCors(res);
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

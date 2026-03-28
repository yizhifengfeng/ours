const path = require("path");
const { handleOptions, badRequest, serverError } = require("../server/_lib/http");

const ROUTES = new Set([
  "admin",
  "danmaku",
  "diandi-events",
  "diandi-stats",
  "diandi-todos",
  "first-records",
  "keywords",
  "letter-reads",
  "letters",
  "messages-position",
  "messages",
  "music-upload-sign",
  "music",
  "place-photos",
  "places",
  "site-settings",
  "upload-sign",
]);

function firstRouteName(req) {
  const raw = req.query && req.query.slug;
  if (Array.isArray(raw)) return String(raw[0] || "").split("/").filter(Boolean)[0] || "";
  if (typeof raw === "string" && raw) return raw.split("/").filter(Boolean)[0] || "";
  const u = req.url || "";
  const pathOnly = u.split("?")[0];
  const cleaned = pathOnly.replace(/^\/api\/?/, "");
  return cleaned.split("/").filter(Boolean)[0] || "";
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    const name = firstRouteName(req);
    if (!name || !ROUTES.has(name)) {
      return badRequest(res, "Unknown route");
    }
    const mod = require(path.join(__dirname, "..", "server", `${name}.js`));
    return mod(req, res);
  } catch (err) {
    return serverError(res, err);
  }
};

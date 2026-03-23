const { requireAdmin } = require("../_lib/admin");
const { handleOptions, unauthorized, ok, methodNotAllowed } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return methodNotAllowed(res);

  const admin = requireAdmin(req);
  if (!admin) return unauthorized(res);

  return ok(res, {
    admin: { id: admin.sub, username: admin.username, role: "admin" },
  });
};

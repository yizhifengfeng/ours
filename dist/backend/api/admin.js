const bcrypt = require("bcryptjs");
const { getSupabase } = require("./_lib/supabase");
const { signAdminToken } = require("./_lib/auth");
const { requireAdmin } = require("./_lib/admin");
const {
  handleOptions,
  readJson,
  badRequest,
  unauthorized,
  ok,
  methodNotAllowed,
  serverError,
} = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const action = String(req.query && (req.query.action || "")).toLowerCase();

  try {
    if (action === "login") {
      if (req.method !== "POST") return methodNotAllowed(res);

      const body = await readJson(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!username || !password) return badRequest(res, "username and password required");

      const sb = getSupabase();
      const { data, error } = await sb
        .from("admins")
        .select("id, username, password")
        .eq("username", username)
        .maybeSingle();

      if (error) throw error;
      if (!data) return unauthorized(res, "Invalid credentials");

      const passOk = await bcrypt.compare(password, data.password);
      if (!passOk) return unauthorized(res, "Invalid credentials");

      const token = signAdminToken({ sub: data.id, username: data.username });
      return ok(res, {
        token,
        admin: { id: data.id, username: data.username },
      });
    }

    if (action === "me") {
      if (req.method !== "GET") return methodNotAllowed(res);

      const admin = requireAdmin(req);
      if (!admin) return unauthorized(res);
      return ok(res, {
        admin: { id: admin.sub, username: admin.username, role: "admin" },
      });
    }

    return badRequest(res, "Unknown action");
  } catch (error) {
    return serverError(res, error);
  }
};


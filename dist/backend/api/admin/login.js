const bcrypt = require("bcryptjs");
const { getSupabase } = require("../_lib/supabase");
const { signAdminToken } = require("../_lib/auth");
const { handleOptions, readJson, badRequest, unauthorized, ok, methodNotAllowed, serverError } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const body = await readJson(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) return badRequest(res, "username and password required");

    const sb = getSupabase();
    const { data, error } = await sb
      .from("admins")
      .select("id, username, password_hash")
      .eq("username", username)
      .maybeSingle();

    if (error) throw error;
    if (!data) return unauthorized(res, "Invalid credentials");

    const passOk = await bcrypt.compare(password, data.password_hash);
    if (!passOk) return unauthorized(res, "Invalid credentials");

    const token = signAdminToken({ sub: data.id, username: data.username });
    return ok(res, {
      token,
      admin: { id: data.id, username: data.username },
    });
  } catch (error) {
    return serverError(res, error);
  }
};

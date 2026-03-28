const { getSupabase } = require("./_lib/supabase");
const { handleOptions, readJson, badRequest, ok, methodNotAllowed, serverError } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "PATCH") return methodNotAllowed(req, res);

  try {
    const body = await readJson(req);
    const id = String(body.id || "").trim();
    const x = Number(body.x);
    const y = Number(body.y);
    if (!id || !Number.isFinite(x) || !Number.isFinite(y)) {
      return badRequest(req, res, "id, x, y are required");
    }

    const safeX = Math.max(0, Math.min(100, x));
    const safeY = Math.max(0, Math.min(100, y));
    const sb = getSupabase();
    const { data, error } = await sb
      .from("messages")
      .update({ x: safeX, y: safeY })
      .eq("id", id)
      .select("id, x, y")
      .single();
    if (error) throw error;
    return ok(req, res, { item: data });
  } catch (error) {
    return serverError(req, res, error);
  }
};

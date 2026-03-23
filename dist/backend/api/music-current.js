const { getSupabase } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/admin");
const { handleOptions, readJson, ok, badRequest, unauthorized, methodNotAllowed, serverError } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    const sb = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await sb
        .from("music_tracks")
        .select("*")
        .eq("is_current", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return ok(res, { item: null });
      const publicUrl = sb.storage.from(data.bucket || "uploads-music").getPublicUrl(data.path || "").data.publicUrl || "";
      return ok(res, { item: { ...data, publicUrl } });
    }

    if (req.method === "POST") {
      const admin = requireAdmin(req);
      if (!admin) return unauthorized(res);
      const body = await readJson(req);
      const trackId = String(body.trackId || "").trim();
      if (!trackId) return badRequest(res, "trackId is required");

      const { error: resetError } = await sb.from("music_tracks").update({ is_current: false }).neq("id", "");
      if (resetError) throw resetError;
      const { data, error } = await sb.from("music_tracks").update({ is_current: true }).eq("id", trackId).select().single();
      if (error) throw error;
      const publicUrl = sb.storage.from(data.bucket || "uploads-music").getPublicUrl(data.path || "").data.publicUrl || "";
      return ok(res, { item: { ...data, publicUrl } });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return serverError(res, error);
  }
};

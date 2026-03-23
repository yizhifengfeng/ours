const { getSupabase } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/admin");
const { handleOptions, readJson, ok, badRequest, unauthorized, methodNotAllowed, serverError } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    const sb = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await sb.from("music_tracks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const items = (data || []).map((item) => {
        const publicUrl = sb.storage.from(item.bucket || "uploads-music").getPublicUrl(item.path || "").data.publicUrl || "";
        return { ...item, publicUrl };
      });
      return ok(res, { items });
    }

    if (req.method === "POST") {
      const admin = requireAdmin(req);
      if (!admin) return unauthorized(res);
      const body = await readJson(req);
      const title = String(body.title || "").trim();
      const bucket = String(body.bucket || "uploads-music");
      const path = String(body.path || "").trim();
      if (!title || !path) return badRequest(res, "title and path are required");
      const payload = { title, bucket, path, is_current: !!body.isCurrent };
      const { data, error } = await sb.from("music_tracks").insert(payload).select().single();
      if (error) throw error;
      const publicUrl = sb.storage.from(data.bucket || "uploads-music").getPublicUrl(data.path || "").data.publicUrl || "";
      return ok(res, { item: { ...data, publicUrl } });
    }

    if (req.method === "DELETE") {
      const admin = requireAdmin(req);
      if (!admin) return unauthorized(res);
      const id = String(req.query.id || "");
      if (!id) return badRequest(res, "Missing query id");
      const { error } = await sb.from("music_tracks").delete().eq("id", id);
      if (error) throw error;
      return ok(res, { success: true });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return serverError(res, error);
  }
};

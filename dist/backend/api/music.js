const { getSupabase } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/admin");
const {
  handleOptions,
  readJson,
  ok,
  badRequest,
  unauthorized,
  methodNotAllowed,
  serverError,
} = require("./_lib/http");

function getPublicUrl(sb, bucket, path) {
  try {
    return (
      sb.storage
        .from(bucket || "uploads-music")
        .getPublicUrl(path || "")
        .data.publicUrl || ""
    );
  } catch (e) {
    return "";
  }
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    const sb = getSupabase();
    const resource = String(req.query && (req.query.resource || "")).toLowerCase();

    if (resource === "current") {
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
        const publicUrl = getPublicUrl(sb, data.bucket, data.path);
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

        const { data, error } = await sb
          .from("music_tracks")
          .update({ is_current: true })
          .eq("id", trackId)
          .select()
          .single();
        if (error) throw error;

        const publicUrl = getPublicUrl(sb, data.bucket, data.path);
        return ok(res, { item: { ...data, publicUrl } });
      }

      return methodNotAllowed(res);
    }

    if (resource === "tracks") {
      if (req.method === "GET") {
        const { data, error } = await sb.from("music_tracks").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        const items = (data || []).map((item) => ({
          ...item,
          publicUrl: getPublicUrl(sb, item.bucket, item.path),
        }));
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

        const publicUrl = getPublicUrl(sb, data.bucket, data.path);
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
    }

    return badRequest(res, "Unknown resource");
  } catch (error) {
    return serverError(res, error);
  }
};


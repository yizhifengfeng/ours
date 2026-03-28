const { getSupabase } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/admin");
const { handleOptions, readJson, ok, badRequest, unauthorized, methodNotAllowed, serverError } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return methodNotAllowed(res);

  const admin = requireAdmin(req);
  if (!admin) return unauthorized(res);

  try {
    const body = await readJson(req);
    const bucket = String(body.bucket || "uploads-music");
    const ext = String(body.ext || "mp3").replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp3";
    const contentType = String(body.contentType || "audio/mpeg");
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const path = `music/${fileName}`;

    const sb = getSupabase();
    const { data, error } = await sb.storage.from(bucket).createSignedUploadUrl(path, {
      upsert: false,
      contentType,
    });
    if (error) throw error;

    return ok(res, { bucket, path, token: data.token, signedUrl: data.signedUrl || null });
  } catch (error) {
    return serverError(res, error);
  }
};

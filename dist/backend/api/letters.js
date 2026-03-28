const { getSupabase } = require("./_lib/supabase");
const { requireAdmin } = require("./_lib/admin");
const { handleOptions, readJson, ok, badRequest, unauthorized, methodNotAllowed, serverError } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  const admin = requireAdmin(req);
  if (!admin) return unauthorized(req, res, "Admin required");

  try {
    const sb = getSupabase();

    if (req.method === "GET") {
      let q = sb.from("letters").select("*");
      if (req.query.date) q = q.eq("date", req.query.date);
      if (req.query.id) q = q.eq("id", req.query.id);
      const { data, error } = await q.order("date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return ok(req, res, { items: data || [] });
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const payload = {
        recipient: body.recipient,
        title: body.title,
        content: body.content,
        date: body.date,
        status: body.status || "pending",
        scheduled_at: body.scheduledAt || null,
      };
      if (!payload.title || !payload.recipient || !payload.content || !payload.date) {
        return badRequest(req, res, "recipient, title, content, date are required");
      }
      const { data, error } = await sb.from("letters").insert(payload).select().single();
      if (error) throw error;
      return ok(req, res, { item: data });
    }

    if (req.method === "PATCH") {
      const id = req.query.id;
      if (!id) return badRequest(req, res, "Missing query id");
      const body = await readJson(req);
      const patch = {
        recipient: body.recipient,
        title: body.title,
        content: body.content,
        date: body.date,
        status: body.status,
        scheduled_at: typeof body.scheduledAt === "undefined" ? undefined : body.scheduledAt || null,
      };
      Object.keys(patch).forEach((k) => typeof patch[k] === "undefined" && delete patch[k]);
      const { data, error } = await sb.from("letters").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return ok(req, res, { item: data });
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) return badRequest(req, res, "Missing query id");
      const { error } = await sb.from("letters").delete().eq("id", id);
      if (error) throw error;
      return ok(req, res, { success: true });
    }

    return methodNotAllowed(req, res);
  } catch (error) {
    return serverError(req, res, error);
  }
};

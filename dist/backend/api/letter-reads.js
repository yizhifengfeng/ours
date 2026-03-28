const { getSupabase } = require("./_lib/supabase");
const { handleOptions, readJson, ok, badRequest, methodNotAllowed, serverError } = require("./_lib/http");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    const sb = getSupabase();

    if (req.method === "GET") {
      const visitorId = String(req.query.visitorId || "").trim();
      if (!visitorId) return badRequest(req, res, "visitorId is required");

      const [{ data: letters, error: lettersError }, { data: reads, error: readsError }] = await Promise.all([
        sb.from("letters").select("id,date"),
        sb.from("letter_reads").select("letter_id").eq("visitor_id", visitorId),
      ]);
      if (lettersError) throw lettersError;
      if (readsError) throw readsError;

      const readSet = new Set((reads || []).map((r) => r.letter_id));
      const unreadByDate = {};
      (letters || []).forEach((l) => {
        if (readSet.has(l.id)) return;
        unreadByDate[l.date] = (unreadByDate[l.date] || 0) + 1;
      });

      return ok(req, res, { unreadByDate });
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const visitorId = String(body.visitorId || "").trim();
      if (!visitorId) return badRequest(req, res, "visitorId is required");

      let letterIds = [];
      if (Array.isArray(body.letterIds) && body.letterIds.length) {
        letterIds = body.letterIds;
      } else if (body.date) {
        const { data: letters, error } = await sb.from("letters").select("id").eq("date", body.date);
        if (error) throw error;
        letterIds = (letters || []).map((l) => l.id);
      } else {
        return badRequest(req, res, "letterIds or date required");
      }

      if (!letterIds.length) return ok(req, res, { inserted: 0 });

      const rows = letterIds.map((id) => ({
        visitor_id: visitorId,
        letter_id: id,
        read_at: new Date().toISOString(),
      }));

      const { error } = await sb.from("letter_reads").upsert(rows, { onConflict: "visitor_id,letter_id" });
      if (error) throw error;
      return ok(req, res, { inserted: rows.length });
    }

    return methodNotAllowed(req, res);
  } catch (error) {
    return serverError(req, res, error);
  }
};

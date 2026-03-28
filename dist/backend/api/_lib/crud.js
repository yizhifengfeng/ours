const { getSupabase } = require("./supabase");
const { requireAdmin } = require("./admin");
const { readJson, ok, badRequest, unauthorized, methodNotAllowed, serverError } = require("./http");

function normalizeOrder(queryOrder) {
  if (!queryOrder) return { column: "created_at", ascending: false };
  const raw = String(queryOrder);
  if (raw.startsWith("-")) return { column: raw.slice(1), ascending: false };
  return { column: raw, ascending: true };
}

async function handleRead(req, res, table, options) {
  const sb = getSupabase();
  const select = (options && options.select) || "*";
  let q = sb.from(table).select(select);

  const filters = (options && options.filters) || [];
  filters.forEach((f) => {
    const v = req.query[f.queryKey];
    if (typeof v !== "undefined" && v !== "") {
      q = q.eq(f.column, v);
    }
  });

  const orderOpt = normalizeOrder(req.query.order || ((options && options.defaultOrder) || "-created_at"));
  q = q.order(orderOpt.column, { ascending: orderOpt.ascending });

  const { data, error } = await q;
  if (error) throw error;
  return ok(req, res, { items: data || [] });
}

async function handleInsert(req, res, table, options) {
  if (options && options.insertRequiresAdmin) {
    const admin = requireAdmin(req);
    if (!admin) return unauthorized(req, res);
  }

  const body = await readJson(req);
  const payload = options && options.pickInsert ? options.pickInsert(body) : body;
  if (!payload || typeof payload !== "object") return badRequest(req, res, "Invalid payload");
  const sb = getSupabase();
  const { data, error } = await sb.from(table).insert(payload).select().single();
  if (error) throw error;
  return ok(req, res, { item: data });
}

async function handlePatch(req, res, table, idField, options) {
  const admin = requireAdmin(req);
  if (!admin) return unauthorized(req, res);

  const id = req.query[idField];
  if (!id) return badRequest(req, res, `Missing query ${idField}`);
  const body = await readJson(req);
  const payload = options && options.pickPatch ? options.pickPatch(body) : body;
  const sb = getSupabase();
  const { data, error } = await sb.from(table).update(payload).eq(idField, id).select().single();
  if (error) throw error;
  return ok(req, res, { item: data });
}

async function handleDelete(req, res, table, idField) {
  const admin = requireAdmin(req);
  if (!admin) return unauthorized(req, res);
  const id = req.query[idField];
  if (!id) return badRequest(req, res, `Missing query ${idField}`);
  const sb = getSupabase();
  const { error } = await sb.from(table).delete().eq(idField, id);
  if (error) throw error;
  return ok(req, res, { success: true });
}

async function routeCrud(req, res, config) {
  try {
    if (req.method === "GET") return await handleRead(req, res, config.table, config);
    if (req.method === "POST") return await handleInsert(req, res, config.table, config);
    if (req.method === "PATCH") return await handlePatch(req, res, config.table, config.idField || "id", config);
    if (req.method === "DELETE") return await handleDelete(req, res, config.table, config.idField || "id");
    return methodNotAllowed(req, res);
  } catch (error) {
    return serverError(req, res, error);
  }
}

module.exports = { routeCrud };

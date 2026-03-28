const { handleOptions } = require("./_lib/http");
const { routeCrud } = require("./_lib/crud");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  return routeCrud(req, res, {
    table: "first_records",
    idField: "id",
    insertRequiresAdmin: true,
    defaultOrder: "-created_at",
    pickInsert(body) {
      return {
        title: String(body.title || "").trim(),
        date: String(body.date || "").trim(),
        photo: String(body.photo || "").trim(),
        description: String(body.description || "").trim(),
        created_at: body.created_at || new Date().toISOString(),
      };
    },
    pickPatch(body) {
      const payload = {};
      if (typeof body.title !== "undefined") payload.title = String(body.title || "").trim();
      if (typeof body.date !== "undefined") payload.date = String(body.date || "").trim();
      if (typeof body.photo !== "undefined") payload.photo = String(body.photo || "").trim();
      if (typeof body.description !== "undefined") payload.description = String(body.description || "").trim();
      return payload;
    },
  });
};

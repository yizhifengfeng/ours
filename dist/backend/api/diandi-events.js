const { handleOptions } = require("./_lib/http");
const { routeCrud } = require("./_lib/crud");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  return routeCrud(req, res, {
    table: "diandi_events",
    idField: "id",
    insertRequiresAdmin: true,
    defaultOrder: "date",
    pickInsert(body) {
      return {
        date: String(body.date || "").trim(),
        title: String(body.title || "").trim(),
        desc: String(body.desc || "").trim(),
      };
    },
    pickPatch(body) {
      const payload = {};
      if (typeof body.date !== "undefined") payload.date = String(body.date || "").trim();
      if (typeof body.title !== "undefined") payload.title = String(body.title || "").trim();
      if (typeof body.desc !== "undefined") payload.desc = String(body.desc || "").trim();
      return payload;
    },
  });
};

const { handleOptions } = require("./_lib/http");
const { routeCrud } = require("./_lib/crud");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  return routeCrud(req, res, {
    table: "diandi_stats",
    idField: "id",
    insertRequiresAdmin: true,
    defaultOrder: "id",
    pickInsert(body) {
      return {
        theme: String(body.theme || "").trim(),
        label: String(body.label || "").trim(),
        type: String(body.type || "").trim(),
        date: String(body.date || "").trim(),
        unit: String(body.unit || "").trim(),
      };
    },
    pickPatch(body) {
      const payload = {};
      if (typeof body.theme !== "undefined") payload.theme = String(body.theme || "").trim();
      if (typeof body.label !== "undefined") payload.label = String(body.label || "").trim();
      if (typeof body.type !== "undefined") payload.type = String(body.type || "").trim();
      if (typeof body.date !== "undefined") payload.date = String(body.date || "").trim();
      if (typeof body.unit !== "undefined") payload.unit = String(body.unit || "").trim();
      return payload;
    },
  });
};

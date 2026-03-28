const { handleOptions } = require("./_lib/http");
const { routeCrud } = require("./_lib/crud");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  return routeCrud(req, res, {
    table: "site_settings",
    idField: "key",
    insertRequiresAdmin: true,
    filters: [{ queryKey: "key", column: "key" }],
    defaultOrder: "key",
    pickInsert(body) {
      return {
        key: String(body.key || "").trim(),
        value_text: String(body.value_text || "").trim(),
      };
    },
    pickPatch(body) {
      const payload = {};
      if (typeof body.value_text !== "undefined") payload.value_text = String(body.value_text || "").trim();
      return payload;
    },
  });
};

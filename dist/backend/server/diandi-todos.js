const { handleOptions } = require("./_lib/http");
const { routeCrud } = require("./_lib/crud");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  return routeCrud(req, res, {
    table: "diandi_todos",
    idField: "id",
    insertRequiresAdmin: true,
    defaultOrder: "-created_at",
    pickInsert(body) {
      return {
        title: String(body.title || "").trim(),
        desc: String(body.desc || "").trim(),
        done: !!body.done,
      };
    },
    pickPatch(body) {
      const payload = {};
      if (typeof body.title !== "undefined") payload.title = String(body.title || "").trim();
      if (typeof body.desc !== "undefined") payload.desc = String(body.desc || "").trim();
      if (typeof body.done !== "undefined") payload.done = !!body.done;
      return payload;
    },
  });
};

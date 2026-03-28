const { handleOptions } = require("./_lib/http");
const { routeCrud } = require("./_lib/crud");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  return routeCrud(req, res, {
    table: "keywords",
    idField: "id",
    insertRequiresAdmin: true,
    defaultOrder: "-created_at",
    pickInsert(body) {
      return {
        owner: body.owner === "boy" ? "boy" : "girl",
        word: String(body.word || body.text || "").trim(),
        size: Number(body.size) > 60 ? Number(body.size) : 92,
        x: typeof body.x === "number" ? body.x : Number(body.x) || 50,
        y: typeof body.y === "number" ? body.y : Number(body.y) || 50,
      };
    },
    pickPatch(body) {
      const payload = {};
      if (typeof body.owner !== "undefined") {
        payload.owner = body.owner === "boy" ? "boy" : "girl";
      }
      if (typeof body.word !== "undefined" || typeof body.text !== "undefined") {
        payload.word = String(body.word || body.text || "").trim();
      }
      if (typeof body.size !== "undefined") {
        payload.size = Number(body.size) > 60 ? Number(body.size) : 92;
      }
      if (typeof body.x !== "undefined") {
        payload.x = typeof body.x === "number" ? body.x : Number(body.x) || 0;
      }
      if (typeof body.y !== "undefined") {
        payload.y = typeof body.y === "number" ? body.y : Number(body.y) || 0;
      }
      return payload;
    },
  });
};

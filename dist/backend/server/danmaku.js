const { handleOptions } = require("./_lib/http");
const { routeCrud } = require("./_lib/crud");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  return routeCrud(req, res, {
    table: "danmaku",
    idField: "id",
    insertRequiresAdmin: true,
    filters: [{ queryKey: "city", column: "place_city" }],
    defaultOrder: "-created_at",
  });
};

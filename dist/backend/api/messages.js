const { handleOptions } = require("./_lib/http");
const { routeCrud } = require("./_lib/crud");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  return routeCrud(req, res, {
    table: "messages",
    idField: "id",
    insertRequiresAdmin: true,
    defaultOrder: "-created_at",
  });
};

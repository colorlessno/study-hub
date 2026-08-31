const items = [{ id: "item-1", name: "sample" }];

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === "GET" && event.rawPath === "/items") {
    return json(200, { items });
  }
  if (event.requestContext?.http?.method === "GET" && event.pathParameters?.id) {
    const item = items.find((candidate) => candidate.id === event.pathParameters.id);
    if (!item) return json(404, { error: "item_not_found", id: event.pathParameters.id });
    return json(200, {
      item,
      eventMapping: {
        rawPath: event.rawPath,
        pathParameters: event.pathParameters,
        queryStringParameters: event.queryStringParameters,
      },
    });
  }
  if (event.requestContext?.http?.method === "POST" && event.rawPath === "/items") {
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "invalid_json" }); }
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return json(400, { error: "name_required" });
    }
    const item = { id: `item-${items.length + 1}`, name: body.name.trim() };
    items.push(item);
    return json(201, { item });
  }
  return json(404, { error: "not_found" });
};

function json(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

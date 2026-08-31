"use strict";

const http = require("node:http");
const port = Number(process.env.PORT || 3042);

const items = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  name: `Item ${index + 1}`,
  status: index % 2 ? "open" : "closed",
  createdAt: `2026-04-${String((index % 28) + 1).padStart(2, "0")}`,
}));
const validSortKeys = new Set(["name", "status", "createdAt"]);
const validStatuses = new Set(["open", "closed"]);

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function parseInteger(value, defaultValue, { minimum, maximum = Number.MAX_SAFE_INTEGER }) {
  if (value === undefined) return { value: defaultValue };
  if (value === "" || !Number.isInteger(Number(value))) return { error: "invalid_integer" };
  const parsed = Number(value);
  if (parsed < minimum || parsed > maximum) return { error: "out_of_range" };
  return { value: parsed };
}

function validateQuery(searchParams) {
  const limit = parseInteger(searchParams.get("limit") ?? undefined, 10, { minimum: 1, maximum: 50 });
  if (limit.error) return { error: `invalid_limit_${limit.error}` };

  const offset = parseInteger(searchParams.get("offset") ?? undefined, 0, { minimum: 0 });
  if (offset.error) return { error: `invalid_offset_${offset.error}` };

  const order = searchParams.get("order") || "asc";
  if (!new Set(["asc", "desc"]).has(order)) return { error: "invalid_order" };

  const status = searchParams.get("status") || "";
  if (status && !validStatuses.has(status)) return { error: "invalid_status" };

  const sort = searchParams.get("sort") || "";
  if (sort && !validSortKeys.has(sort)) return { error: "invalid_sort" };

  return {
    value: {
      keyword: searchParams.get("keyword") || "",
      status,
      sort,
      order,
      limit: limit.value,
      offset: offset.value,
    },
  };
}

function buildPageMetadata(total, limit, offset, returned) {
  return {
    total,
    limit,
    offset,
    returned,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
    hasPrevious: offset > 0,
    hasNext: offset + returned < total,
  };
}

function createServer() {
  return http.createServer((req, res) => {
    const parsed = new URL(req.url, "http://localhost");
    if (parsed.pathname !== "/items") return send(res, 404, { error: "not_found" });
    if (req.method !== "GET") {
      return send(res, 405, { error: "method_not_allowed" }, { Allow: "GET" });
    }

    const query = validateQuery(parsed.searchParams);
    if (query.error) return send(res, 400, { error: query.error });

    const { keyword, status, sort, order, limit, offset } = query.value;
    const normalizedKeyword = keyword.toLowerCase();
    const filtered = items.filter(
      (item) =>
        (!normalizedKeyword || item.name.toLowerCase().includes(normalizedKeyword)) &&
        (!status || item.status === status),
    );
    if (sort) {
      filtered.sort(
        (left, right) =>
          String(left[sort]).localeCompare(String(right[sort])) * (order === "desc" ? -1 : 1),
      );
    }

    const pageItems = filtered.slice(offset, offset + limit);
    return send(res, 200, {
      items: pageItems,
      meta: buildPageMetadata(filtered.length, limit, offset, pageItems.length),
    });
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => console.log(`web42 http://127.0.0.1:${port}/items`));
}

module.exports = { buildPageMetadata, createServer, parseInteger, validateQuery };

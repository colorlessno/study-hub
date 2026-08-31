function unsafeSearch(name) {
  return `select * from products where name like '%${name}%'`;
}

function safeSearch(name, status) {
  const where = [];
  const params = [];
  if (name) {
    params.push(`%${name}%`);
    where.push(`name like $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  return { sql: `select * from products${where.length ? ` where ${where.join(" and ")}` : ""}`, params };
}

module.exports = { unsafeSearch, safeSearch };

export const initialItems = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' }
];

export function createItem(items, name) {
  const normalizedName = name.trim();
  if (!normalizedName) return items;
  const nextId = items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  return [...items, { id: nextId, name: normalizedName }];
}

export function updateItem(items, id, name) {
  const normalizedName = name.trim();
  if (!normalizedName) return items;
  return items.map((item) => item.id === id ? { ...item, name: normalizedName } : item);
}

export function deleteItem(items, id) {
  return items.filter((item) => item.id !== id);
}

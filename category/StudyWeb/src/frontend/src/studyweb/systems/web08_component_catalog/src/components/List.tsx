type ListItem = {
  id: string;
  label: string;
};

type ListProps = {
  items: ListItem[];
  emptyMessage?: string;
};

export function List({ items, emptyMessage = "表示する項目はありません。" }: ListProps) {
  if (items.length === 0) {
    return <p className="empty-message">{emptyMessage}</p>;
  }

  return (
    <ul className="catalog-list">
      {items.map((item) => (
        <li key={item.id}>{item.label}</li>
      ))}
    </ul>
  );
}

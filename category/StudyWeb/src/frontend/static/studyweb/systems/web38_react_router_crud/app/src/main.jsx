import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  HashRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom';
import { createItem, deleteItem, initialItems, updateItem } from './items.js';

function Layout({ children }) {
  const location = useLocation();
  return (
    <>
      <h1>URLと登録・参照・更新・削除画面の対応</h1>
      <nav aria-label="テーマ内の画面移動">
        <Link to="/items">一覧</Link>
        <Link to="/items/new">新規作成</Link>
        <Link to="/items/999">対象なし例</Link>
        <button type="button" onClick={() => history.back()}>戻る</button>
        <button type="button" onClick={() => history.forward()}>進む</button>
      </nav>
      <p className="current-route" aria-live="polite">現在のURL: #{location.pathname}</p>
      <main>{children}</main>
    </>
  );
}

function ItemList({ items }) {
  return (
    <section>
      <h2>一覧</h2>
      {items.length === 0 ? <p>登録された項目はありません。</p> : (
        <ul className="item-list">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <Link to={`/items/${item.id}`}>詳細</Link>
              <Link to={`/items/${item.id}/edit`}>編集</Link>
              <Link to={`/items/${item.id}/delete`}>削除</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemForm({ item, onSave }) {
  const [name, setName] = useState(item?.name ?? '');
  const navigate = useNavigate();
  const title = item ? '編集' : '新規作成';

  function submit(event) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave(name);
    navigate('/items');
  }

  return (
    <section>
      <h2>{title}</h2>
      <form onSubmit={submit}>
        <label>名前 <input value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <div className="actions">
          <button type="submit">保存</button>
          <Link to="/items">キャンセル</Link>
        </div>
      </form>
    </section>
  );
}

function ItemRoute({ items, mode, onUpdate, onDelete }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = Number(id);
  const item = items.find((candidate) => candidate.id === numericId);
  if (!item) return <NotFound />;

  if (mode === 'edit') {
    return <ItemForm item={item} onSave={(name) => onUpdate(numericId, name)} />;
  }

  if (mode === 'delete') {
    return (
      <section>
        <h2>削除確認</h2>
        <p>「{item.name}」を削除します。</p>
        <div className="actions">
          <button type="button" onClick={() => { onDelete(numericId); navigate('/items'); }}>削除する</button>
          <Link to="/items">キャンセル</Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2>詳細</h2>
      <dl><dt>ID</dt><dd>{item.id}</dd><dt>名前</dt><dd>{item.name}</dd></dl>
      <div className="actions"><Link to={`/items/${item.id}/edit`}>編集</Link><Link to="/items">一覧へ戻る</Link></div>
    </section>
  );
}

function NotFound() {
  return <section role="alert"><h2>該当するページがありません</h2><Link to="/items">一覧へ戻る</Link></section>;
}

function App() {
  const [items, setItems] = useState(initialItems);
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/items" replace />} />
        <Route path="/items" element={<ItemList items={items} />} />
        <Route path="/items/new" element={<ItemForm onSave={(name) => setItems((current) => createItem(current, name))} />} />
        <Route path="/items/:id" element={<ItemRoute items={items} mode="detail" />} />
        <Route path="/items/:id/edit" element={<ItemRoute items={items} mode="edit" onUpdate={(id, name) => setItems((current) => updateItem(current, id, name))} />} />
        <Route path="/items/:id/delete" element={<ItemRoute items={items} mode="delete" onDelete={(id) => setItems((current) => deleteItem(current, id))} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

createRoot(document.querySelector('#app')).render(<HashRouter><App /></HashRouter>);

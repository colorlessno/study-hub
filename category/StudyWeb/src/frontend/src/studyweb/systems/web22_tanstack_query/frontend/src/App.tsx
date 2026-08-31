import { useQuery } from "@tanstack/react-query";
import { fetchTasks } from "./api/tasks";

export default function App() {
  const { data, isError, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  return (
    <main className="app-shell">
      <p className="sample-label">web22</p>
      <h1>TanStack QueryによるAPI取得</h1>
      <button type="button" onClick={() => refetch()}>
        再取得
      </button>
      {isLoading && <p>読み込み中です。</p>}
      {isFetching && !isLoading && <p>再取得中です。</p>}
      {isError && <p className="error">取得失敗: {(error as Error).message}</p>}
      {data && (
        <ul>
          {data.map((task) => (
            <li key={task.id}>{task.title}</li>
          ))}
        </ul>
      )}
    </main>
  );
}

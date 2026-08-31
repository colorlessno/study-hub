export type Task = {
  id: string;
  title: string;
  done: boolean;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:13022";

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${apiUrl}/tasks`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

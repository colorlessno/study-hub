export type Task = {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string;
};

export type Filter = "all" | "active" | "done";

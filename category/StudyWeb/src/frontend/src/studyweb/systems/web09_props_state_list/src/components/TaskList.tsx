import type { Task } from "../types";
import { TaskItem } from "./TaskItem";

type TaskListProps = {
  tasks: Task[];
};

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="empty-message">条件に合うタスクはありません。</p>;
  }

  return (
    <ul className="todo-list">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}

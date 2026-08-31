import type { Task } from "../types";

type TaskItemProps = {
  task: Task;
};

export function TaskItem({ task }: TaskItemProps) {
  return (
    <li className="todo-item">
      <div>
        <strong>{task.title}</strong>
        {task.dueDate && <span>期限: {task.dueDate}</span>}
      </div>
      <span className={task.done ? "status done" : "status active"}>
        {task.done ? "完了" : "未完了"}
      </span>
    </li>
  );
}

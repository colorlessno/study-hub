import type { Filter } from "../types";

type FilterButtonsProps = {
  currentFilter: Filter;
  onChange: (filter: Filter) => void;
};

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "active", label: "未完了" },
  { value: "done", label: "完了" },
];

export function FilterButtons({ currentFilter, onChange }: FilterButtonsProps) {
  return (
    <div className="filter-buttons" aria-label="表示フィルタ">
      {filters.map((filter) => (
        <button
          key={filter.value}
          className={currentFilter === filter.value ? "active" : ""}
          type="button"
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

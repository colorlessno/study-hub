import type { CatalogMode, ThemeChecklist } from '../../shared/catalog';
import {
  browserLearningProgressRepository,
  type LearningProgressRepository
} from './learningProgressRepository';

export type LearningState = 'not-started' | 'in-progress' | 'completed';

export function completedItemIds(
  catalog: CatalogMode,
  checklist: ThemeChecklist,
  repository: LearningProgressRepository = browserLearningProgressRepository
): string[] {
  const validIds = new Set(checklist.items.map((item) => item.id));
  return (repository.read(catalog)[checklist.themeId] ?? []).filter((id) => validIds.has(id));
}

export function learningState(checklist: ThemeChecklist, completedIds: string[]): LearningState {
  if (completedIds.length === 0) return 'not-started';
  const completed = new Set(completedIds);
  return checklist.items.every((item) => completed.has(item.id)) ? 'completed' : 'in-progress';
}

export function learningStateLabel(state: LearningState): string {
  if (state === 'completed') return '学習済み';
  if (state === 'in-progress') return '進行中';
  return '未着手';
}

export function saveThemeProgress(
  catalog: CatalogMode,
  checklist: ThemeChecklist,
  completedIds: string[],
  repository: LearningProgressRepository = browserLearningProgressRepository
): string[] {
  const validIds = new Set(checklist.items.map((item) => item.id));
  const normalized = [...new Set(completedIds)].filter((id) => validIds.has(id));
  const progress = repository.read(catalog);
  if (normalized.length === 0) {
    delete progress[checklist.themeId];
  } else {
    progress[checklist.themeId] = normalized;
  }
  repository.write(catalog, progress);
  return normalized;
}

export function setChecklistsCompleted(
  catalog: CatalogMode,
  checklists: ThemeChecklist[],
  completed: boolean,
  repository: LearningProgressRepository = browserLearningProgressRepository
): void {
  const progress = repository.read(catalog);
  for (const checklist of checklists) {
    if (completed) {
      progress[checklist.themeId] = checklist.items.map((item) => item.id);
    } else {
      delete progress[checklist.themeId];
    }
  }
  repository.write(catalog, progress);
}

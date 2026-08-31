import type { CatalogMode } from '../../shared/catalog';

export type StoredLearningProgress = Record<string, string[]>;

export interface LearningProgressRepository {
  read(catalog: CatalogMode): StoredLearningProgress;
  write(catalog: CatalogMode, progress: StoredLearningProgress): void;
}

type ProgressStorage = Pick<Storage, 'getItem' | 'setItem'>;

const storagePrefix = 'studyhub:learning-progress:';

function storageKey(catalog: CatalogMode): string {
  return `${storagePrefix}${catalog}`;
}

function normalizeStoredProgress(value: unknown): StoredLearningProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string[]] => (
    Array.isArray(entry[1]) && entry[1].every((item) => typeof item === 'string')
  )));
}

export function createStorageLearningProgressRepository(
  storage: ProgressStorage
): LearningProgressRepository {
  return {
    read(catalog) {
      try {
        const raw = storage.getItem(storageKey(catalog));
        return raw ? normalizeStoredProgress(JSON.parse(raw) as unknown) : {};
      } catch {
        return {};
      }
    },
    write(catalog, progress) {
      try {
        storage.setItem(storageKey(catalog), JSON.stringify(progress));
      } catch {
        // 保存できないブラウザ設定でも、画面内のチェック操作は継続する。
      }
    }
  };
}

export const browserLearningProgressRepository: LearningProgressRepository = {
  read(catalog) {
    try {
      return createStorageLearningProgressRepository(window.localStorage).read(catalog);
    } catch {
      return {};
    }
  },
  write(catalog, progress) {
    try {
      createStorageLearningProgressRepository(window.localStorage).write(catalog, progress);
    } catch {
      // localStorage自体を参照できない場合も、画面内のチェック操作は継続する。
    }
  }
};

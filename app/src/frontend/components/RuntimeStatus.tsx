import type { RuntimeState } from '../../shared/catalog';

const labels: Record<RuntimeState, string> = {
  stopped: '停止済み',
  starting: '起動中',
  ready: '利用可能',
  stopping: '停止中',
  failed: '失敗',
  unavailable: '環境なし'
};

export function RuntimeStatus({ state }: { state: RuntimeState }) {
  return <span className={`status status-${state}`}>{labels[state]}</span>;
}

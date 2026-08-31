export type CatalogMode = 'sample' | 'actual';
export type PresentationMode = 'document' | 'web' | 'request' | 'command' | 'external-app';
export type LifecycleMode = 'none' | 'one-shot' | 'process' | 'stack' | 'shared' | 'manual';
export type RuntimeState = 'stopped' | 'starting' | 'ready' | 'stopping' | 'failed' | 'unavailable';
export type IntegrationMode = 'document' | 'embedded' | 'request' | 'command' | 'external';
export type ThemeInteractionMode =
  | 'read-only'
  | 'screen-operation'
  | 'single-action'
  | 'multiple-actions'
  | 'stateful-sequence';
export type ThemeResourceKind =
  | 'material'
  | 'readme'
  | 'source'
  | 'requirements'
  | 'design'
  | 'template'
  | 'artifact';
export type ThemeResourceFormat = 'markdown' | 'text' | 'source';

export interface ThemeResource {
  id: string;
  label: string;
  kind: ThemeResourceKind;
  format: ThemeResourceFormat;
  path: string;
}

export interface ThemeResourceContent extends ThemeResource {
  content: string;
}
export type ActualThemeConnection =
  | { type: 'markdown'; file: string }
  | { type: 'static-web'; root: string; entryFile: string }
  | {
      type: 'web-process';
      cwd: string;
      command: 'node' | 'python' | 'python-venv';
      args: string[];
      url: string;
      healthUrl: string;
    }
  | {
      type: 'request-process';
      cwd: string;
      command: 'node' | 'python';
      args: string[];
      env: Record<string, string>;
      url: string;
      healthUrl: string;
      request?: RequestDefinition;
      requests?: RequestOperationDefinition[];
    }
  | {
      type: 'request-stack';
      cwd: string;
      startup: ProcessDefinition[];
      cleanup: ProcessDefinition[];
      request?: RequestDefinition;
      requests?: RequestOperationDefinition[];
    }
  | ({
      type: 'command-one-shot';
      cwd: string;
      environment?: string[];
      timeoutSeconds?: number;
    } & (
      | { commands: ProcessDefinition[]; operations?: never }
      | { commands?: never; operations: CommandOperationDefinition[] }
    ))
  | {
      type: 'command-stack';
      cwd: string;
      startup: ProcessDefinition[];
      run:
        | { type: 'commands'; commands: ProcessDefinition[] }
        | { type: 'operations'; operations: CommandOperationDefinition[] }
        | { type: 'request'; request: RequestDefinition };
      cleanup: ProcessDefinition[];
      environment: string[];
      timeoutSeconds: number;
    }
  | {
      type: 'web-stack';
      cwd: string;
      startup: ProcessDefinition[];
      cleanup: ProcessDefinition[];
      environment: string[];
      timeoutSeconds: number;
      run?: { type: 'operations'; operations: CommandOperationDefinition[] };
    }
  | {
      type: 'web-shared';
      runtimeId: string;
      cwd: string;
      startup: ProcessDefinition[];
      cleanup: ProcessDefinition[];
      environment: string[];
      timeoutSeconds: number;
    }
  | {
      type: 'external-process';
      cwd: string;
      command: 'electron';
      args: string[];
      environment: string[];
    };

export interface RequestDefinition {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string;
  input?: {
    target: 'body' | 'query' | 'header';
    name: string;
  };
}

export interface RequestInputDefinition {
  name: string;
  label: string;
  target: 'path' | 'body' | 'query' | 'header';
  type?: 'string' | 'boolean';
  required?: boolean;
  placeholder?: string;
}

export interface RequestOperationDefinition extends Omit<RequestDefinition, 'input'> {
  id: string;
  label: string;
  inputs?: RequestInputDefinition[];
  timeoutMilliseconds?: number;
  retry?: {
    maxAttempts: number;
    delayMilliseconds: number;
    statusCodes: number[];
  };
}

export interface CommandOperationDefinition {
  id: string;
  label: string;
  processes: ProcessDefinition[];
  input?: {
    label: string;
    defaultValue?: string;
    placeholder?: string;
  };
}

export interface FieldCheckDefinition {
  command: 'node' | 'npm' | 'python';
  args: string[];
  timeoutSeconds: number;
}

export interface Field {
  id: string;
  name: string;
  summary: string;
  order: number;
  themeCount?: number;
  entryFile?: string;
  check?: FieldCheckDefinition;
}

export interface ThemeGroup {
  id: string;
  name: string;
  summary: string;
  order: number;
}

export interface ThemeListProfile {
  interactionMode: ThemeInteractionMode;
  initialization?: string;
  environmentScope?: string;
  cleanupImpact?: string;
  relationshipNote?: string;
  outputNote?: string;
}

export interface ThemeChecklistItem {
  id: string;
  label: string;
}

export interface ThemeChecklist {
  schemaVersion: 1;
  revision: number;
  themeId: string;
  fieldId: string;
  title: string;
  items: ThemeChecklistItem[];
}

export interface ProcessDefinition {
  id: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  temporaryDirectoryEnv?: string;
  stdinFile?: string;
  execution?: 'service' | 'task';
  url?: string;
  healthUrl?: string;
  allowFailure?: boolean;
}

export interface Theme {
  id: string;
  fieldId: string;
  name: string;
  summary: string;
  presentation: PresentationMode;
  lifecycle: LifecycleMode;
  material: {
    path: string;
    openMode: 'embedded' | 'new-window' | 'none';
  };
  environment: {
    required: string[];
  };
  group?: ThemeGroup;
  listProfile?: ThemeListProfile;
  operations: {
    open?: {
      mode: 'embedded' | 'new-window';
    };
    start?: {
      runtimeId: string;
      processes: ProcessDefinition[];
      cleanup?: ProcessDefinition[];
    };
    run?: {
      mode: 'request' | 'command';
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS';
      url?: string;
      request?: Omit<RequestDefinition, 'method' | 'url'>;
      requests?: RequestOperationDefinition[];
      commandOperations?: CommandOperationDefinition[];
      process?: ProcessDefinition;
      processes?: ProcessDefinition[];
      autoStopAfterRun?: boolean;
    };
    stop?: {
      mode: 'managed' | 'release';
    };
  };
  timeoutSeconds?: number;
  integrationStatus?: 'connected' | 'metadata-only';
  integrationMode: IntegrationMode;
  entryFile?: string;
  resources?: ThemeResource[];
  actualConnection?: ActualThemeConnection;
}

export interface ThemeSummary {
  id: string;
  fieldId: string;
  name: string;
  summary: string;
  presentation: PresentationMode;
  lifecycle: LifecycleMode;
  integrationStatus?: 'connected' | 'metadata-only';
  integrationMode: IntegrationMode;
  runtimeState: RuntimeState;
  environment?: string[];
  group?: ThemeGroup;
  operationCount: number;
  listProfile?: ThemeListProfile;
}

export interface RuntimeProcessView {
  id: string;
  url?: string;
}

export interface RuntimeView {
  themeId: string;
  runtimeId: string | null;
  state: RuntimeState;
  message: string;
  processes: RuntimeProcessView[];
  consumers: string[];
}

export interface RunResult {
  ok: boolean;
  statusCode?: number;
  exitCode?: number | null;
  headers?: Record<string, string | string[]>;
  output: unknown;
}

export interface LogEntry {
  sequence: number;
  time: string;
  source: string;
  level: 'info' | 'error';
  message: string;
}

export interface FieldCheckReport {
  result: RunResult;
  logs: LogEntry[];
}

export type ReadinessStatus = 'ready' | 'missing' | 'manual';

export interface FieldReadinessItem {
  id: string;
  label: string;
  status: ReadinessStatus;
  message: string;
}

export interface FieldReadinessReport {
  fieldId: string;
  checkedAt: string;
  ready: boolean;
  items: FieldReadinessItem[];
}

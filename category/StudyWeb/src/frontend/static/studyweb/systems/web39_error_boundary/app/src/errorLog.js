export function createErrorRecord(error, componentStack = '') {
  return {
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
    componentStack: componentStack.trim()
  };
}

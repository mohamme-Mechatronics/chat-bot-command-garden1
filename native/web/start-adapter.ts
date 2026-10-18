// Portable clients use authenticated HTTP operations, never a local privileged server.
export function useServerFn<T extends (...args: never[]) => unknown>(fn: T): T { return fn; }
import { AsyncLocalStorage } from 'node:async_hooks';

export interface WorkerLifetime { waitUntil(task: Promise<unknown>): void }
// Capture only the trusted lifetime hook, never request headers, identity or props.
const lifetimes = new AsyncLocalStorage<WorkerLifetime>();

export function runWithWorkerLifetime<T>(context: WorkerLifetime, run: () => T): T {
  return lifetimes.run({ waitUntil: task => context.waitUntil(task) }, run);
}

/** Retain the same bounded job before it starts; its caller still awaits its result. */
export function retainMaintenance<T>(run: () => Promise<T>): Promise<T> {
  const lifetime = lifetimes.getStore();
  if (!lifetime) return run();
  const task = Promise.resolve().then(run);
  lifetime.waitUntil(task.then(() => undefined, () => {
    // Keep raw upstream errors and private observations out of public logs.
    console.warn('Catalog maintenance failed');
  }));
  return task;
}

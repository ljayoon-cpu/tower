type Handler<P> = (payload: P) => void;

export function createEventBus<T extends Record<string, unknown>>() {
  const map = new Map<keyof T, Set<Handler<unknown>>>();

  return {
    on<K extends keyof T>(event: K, fn: Handler<T[K]>) {
      let set = map.get(event);
      if (!set) { set = new Set(); map.set(event, set); }
      set.add(fn as Handler<unknown>);
    },
    off<K extends keyof T>(event: K, fn: Handler<T[K]>) {
      map.get(event)?.delete(fn as Handler<unknown>);
    },
    emit<K extends keyof T>(event: K, payload: T[K]) {
      map.get(event)?.forEach((fn) => (fn as Handler<T[K]>)(payload));
    },
    clear() { map.clear(); },
  };
}

export type EventBus<T extends Record<string, unknown>> = ReturnType<typeof createEventBus<T>>;

const listeners = new Map();
export function on(type, cb){ (listeners.get(type) ?? listeners.set(type, new Set()).get(type)).add(cb); }
export function off(type, cb){ listeners.get(type)?.delete(cb); }
export function emit(type, payload){ listeners.get(type)?.forEach(cb => cb(payload)); }

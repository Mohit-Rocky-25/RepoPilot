export function initCache() {
  return new Map();
}

export function serialize(key: any): [string, any] {
  if (typeof key === "function") {
    try {
      key = key();
    } catch {
      key = "";
    }
  }
  return [typeof key === "string" ? key : JSON.stringify(key), key];
}

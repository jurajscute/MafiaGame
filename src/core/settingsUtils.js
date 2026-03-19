export function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj)
}

export function setNestedValue(obj, path, value) {
  const keys = path.split(".")
  const last = keys.pop()
  let target = obj

  for (const key of keys) {
    if (!target[key] || typeof target[key] !== "object") {
      target[key] = {}
    }
    target = target[key]
  }

  target[last] = value
}
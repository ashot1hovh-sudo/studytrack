export function getStorageFileName(path?: string | null) {
  if (!path) return undefined
  const rawName = path.split('/').pop()
  if (!rawName) return undefined

  return rawName.replace(/^\d+-/, '')
}

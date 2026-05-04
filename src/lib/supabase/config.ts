export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  return { url, key }
}

export function hasSupabaseConfig() {
  const { url, key } = getSupabaseConfig()
  return Boolean(url && key)
}

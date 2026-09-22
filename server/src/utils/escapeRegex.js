export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function hasWord(text, word) {
  const normalized = text.replace(/_/g, ' ')
  return new RegExp(`\\b${escapeRegex(word)}\\b`, 'i').test(normalized)
}

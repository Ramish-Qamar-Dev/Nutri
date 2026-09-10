// Only remove common clipboard wrappers; never guess missing key characters.
export function normalizeApiKey(input: string): string {
  let value = input.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  value = value.replace(/^(?:export\s+)?(?:GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*/i, '').trim();
  const pairs: Record<string, string> = {'"': '"', "'": "'", '`': '`', '“': '”', '‘': '’'};
  if (pairs[value[0]] && value.endsWith(pairs[value[0]])) value = value.slice(1, -1).trim();
  return value;
}

export function apiKeyInputError(value: string): string | null {
  if (!value) return 'Paste your full Gemini API key.';
  if (/[•*…]|\.{3}/.test(value)) return 'This looks like a hidden or shortened key. Use Copy API key in Google AI Studio to copy the full key.';
  if (/\s/.test(value)) return 'The key contains spaces or line breaks. Copy only the full API key, without its name or other text.';
  if (!/^[A-Za-z0-9_.-]{20,200}$/.test(value)) return 'This does not look like a complete API key. Use Copy API key in Google AI Studio; do not paste a key name, project ID, or URL.';
  return null;
}

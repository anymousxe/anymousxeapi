// key validation system - dont even think about it 🔒

function getCustomKeys() {
  try {
    const raw = process.env.CUSTOM_API_KEYS || '[]';
    return JSON.parse(raw);
  } catch {
    // bro fumbled the json 💀
    return [];
  }
}

function validateKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('any-')) return null;

  const keys = getCustomKeys();
  const found = keys.find(k => k.key === apiKey && k.active !== false);
  return found || null;
}

function getAllKeys() {
  return getCustomKeys();
}

module.exports = { validateKey, getAllKeys, getCustomKeys };

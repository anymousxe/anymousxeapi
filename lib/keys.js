// key validation - access control for the whole operation
const fs = require('fs');
const path = require('path');

function getCustomKeys() {
  try {
    const keysPath = path.join(__dirname, '..', 'keys.json');
    if (fs.existsSync(keysPath)) {
      return JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    }
  } catch {
    // json is borked
  }
  return [];
}

function validateKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('any-')) return null;
  const keys = getCustomKeys();
  const found = keys.find(k => k.key === apiKey && k.active !== false);
  return found || null;
}

function hasImagePermission(keyData) {
  return keyData && keyData.image === true;
}

function getAllKeys() {
  return getCustomKeys();
}

module.exports = { validateKey, hasImagePermission, getAllKeys, getCustomKeys };

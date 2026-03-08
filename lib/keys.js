// key validation system - dont even think about it 🔒
const fs = require('fs');
const path = require('path');

function getCustomKeys() {
  try {
    // read keys straight from the file that deploys with the project
    const keysPath = path.join(__dirname, '..', 'keys.json');
    if (fs.existsSync(keysPath)) {
      return JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    }
  } catch {
    // bro fumbled the json 💀
  }
  return [];
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

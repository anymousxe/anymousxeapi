// key management cli - run this to create keys and stuff 🔑
// usage:
//   node manage-keys.js create [label]   → makes a new key
//   node manage-keys.js list              → shows all keys
//   node manage-keys.js delete <key>      → yeets a key
//   node manage-keys.js export            → spits out json for vercel env var

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEYS_FILE = path.join(__dirname, 'keys.json');

// load keys from file or start fresh
function loadKeys() {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
        }
    } catch {
        // file is cooked, start over
    }
    return [];
}

// save keys back to file
function saveKeys(keys) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

// generate a random key like any-a8f3k2m9x1
function generateKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'any-';
    for (let i = 0; i < 10; i++) {
        result += chars[crypto.randomInt(chars.length)];
    }
    return result;
}

// the command handler - ts tuff mango
const [, , command, ...args] = process.argv;

switch (command) {
    case 'create': {
        const label = args.join(' ') || 'unnamed';
        const keys = loadKeys();
        const newKey = {
            key: generateKey(),
            label: label,
            created: new Date().toISOString(),
            active: true
        };
        keys.push(newKey);
        saveKeys(keys);
        console.log('\n✅ key created successfully\n');
        console.log(`   key:     ${newKey.key}`);
        console.log(`   label:   ${newKey.label}`);
        console.log(`   created: ${newKey.created}`);
        console.log('\n💡 run "node manage-keys.js export" to get the json for vercel\n');
        break;
    }

    case 'list': {
        const keys = loadKeys();
        if (keys.length === 0) {
            console.log('\n📭 no keys yet. run "node manage-keys.js create [label]" to make one\n');
        } else {
            console.log(`\n🔑 ${keys.length} key(s):\n`);
            keys.forEach((k, i) => {
                const status = k.active !== false ? '🟢' : '🔴';
                console.log(`  ${i + 1}. ${status} ${k.key}`);
                console.log(`     label: ${k.label} | created: ${k.created}`);
            });
            console.log('');
        }
        break;
    }

    case 'delete': {
        const keyToDelete = args[0];
        if (!keyToDelete) {
            console.log('\n❌ specify which key to delete: node manage-keys.js delete any-xxxxx\n');
            break;
        }
        const keys = loadKeys();
        const before = keys.length;
        const filtered = keys.filter(k => k.key !== keyToDelete);
        if (filtered.length === before) {
            console.log(`\n❌ key "${keyToDelete}" not found\n`);
        } else {
            saveKeys(filtered);
            console.log(`\n🗑️  deleted key: ${keyToDelete}\n`);
            console.log('💡 remember to update vercel env var with: node manage-keys.js export\n');
        }
        break;
    }

    case 'export': {
        const keys = loadKeys();
        const json = JSON.stringify(keys);
        console.log('\n📋 copy this entire line and paste it as CUSTOM_API_KEYS in vercel:\n');
        console.log(json);
        console.log('\n');
        break;
    }

    default: {
        console.log(`
🔑 anymousxeapi key manager

commands:
  create [label]   create a new api key
  list             show all keys
  delete <key>     delete a specific key
  export           output json for vercel env var

examples:
  node manage-keys.js create my-friend-dave
  node manage-keys.js list
  node manage-keys.js delete any-a8f3k2m9x1
  node manage-keys.js export
`);
    }
}

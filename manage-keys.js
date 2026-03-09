// key management cli
// usage:
//   node manage-keys.js create [label]           makes a new key
//   node manage-keys.js create [label] --image   makes a key with image perms
//   node manage-keys.js list                     shows all keys
//   node manage-keys.js delete <key>             removes a key
//   node manage-keys.js grant-image <key>        adds image perms to a key
//   node manage-keys.js revoke-image <key>       removes image perms from a key
//
// after changes, push to git for vercel to pick up

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEYS_FILE = path.join(__dirname, 'keys.json');

function loadKeys() {
    try {
        if (fs.existsSync(KEYS_FILE)) {
            return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
        }
    } catch { }
    return [];
}

function saveKeys(keys) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

function generateKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'any-';
    for (let i = 0; i < 10; i++) {
        result += chars[crypto.randomInt(chars.length)];
    }
    return result;
}

const [, , command, ...args] = process.argv;

switch (command) {
    case 'create': {
        const hasImage = args.includes('--image');
        const label = args.filter(a => a !== '--image').join(' ') || 'unnamed';
        const keys = loadKeys();
        const newKey = {
            key: generateKey(),
            label: label,
            created: new Date().toISOString(),
            active: true,
            image: hasImage
        };
        keys.push(newKey);
        saveKeys(keys);
        console.log('\n  key created\n');
        console.log(`  key:     ${newKey.key}`);
        console.log(`  label:   ${newKey.label}`);
        console.log(`  image:   ${hasImage ? 'yes' : 'no'}`);
        console.log(`  created: ${newKey.created}`);
        console.log('\n  push to git to deploy\n');
        break;
    }

    case 'list': {
        const keys = loadKeys();
        if (keys.length === 0) {
            console.log('\n  no keys yet. run "node manage-keys.js create [label]" to make one\n');
        } else {
            console.log(`\n  ${keys.length} key(s):\n`);
            keys.forEach((k, i) => {
                const status = k.active !== false ? 'active' : 'inactive';
                const img = k.image ? ' [image]' : '';
                console.log(`  ${i + 1}. [${status}] ${k.key}${img}`);
                console.log(`     label: ${k.label} | created: ${k.created}`);
            });
            console.log('');
        }
        break;
    }

    case 'delete': {
        const keyToDelete = args[0];
        if (!keyToDelete) {
            console.log('\n  specify which key: node manage-keys.js delete any-xxxxx\n');
            break;
        }
        const keys = loadKeys();
        const before = keys.length;
        const filtered = keys.filter(k => k.key !== keyToDelete);
        if (filtered.length === before) {
            console.log(`\n  key "${keyToDelete}" not found\n`);
        } else {
            saveKeys(filtered);
            console.log(`\n  deleted: ${keyToDelete}\n`);
        }
        break;
    }

    case 'grant-image': {
        const targetKey = args[0];
        if (!targetKey) {
            console.log('\n  specify which key: node manage-keys.js grant-image any-xxxxx\n');
            break;
        }
        const keys = loadKeys();
        const found = keys.find(k => k.key === targetKey);
        if (!found) {
            console.log(`\n  key "${targetKey}" not found\n`);
        } else {
            found.image = true;
            saveKeys(keys);
            console.log(`\n  image permission granted to: ${targetKey}\n`);
        }
        break;
    }

    case 'revoke-image': {
        const targetKey = args[0];
        if (!targetKey) {
            console.log('\n  specify which key: node manage-keys.js revoke-image any-xxxxx\n');
            break;
        }
        const keys = loadKeys();
        const found = keys.find(k => k.key === targetKey);
        if (!found) {
            console.log(`\n  key "${targetKey}" not found\n`);
        } else {
            found.image = false;
            saveKeys(keys);
            console.log(`\n  image permission revoked from: ${targetKey}\n`);
        }
        break;
    }

    default: {
        console.log(`
  anymousxeapi key manager

  commands:
    create [label]           create a new api key
    create [label] --image   create with image generation permission
    list                     show all keys
    delete <key>             delete a key
    grant-image <key>        add image permission to existing key
    revoke-image <key>       remove image permission from existing key

  examples:
    node manage-keys.js create my-friend
    node manage-keys.js create vip-user --image
    node manage-keys.js grant-image any-a8f3k2m9x1
    node manage-keys.js list
`);
    }
}

/**
 * Client messaging crypto (Web Crypto).
 * Identity keys sync across the user's devices via an authenticated server backup.
 */

const DB_NAME = 'savepoint-e2e';
const STORE = 'keys';
const KEY_ID = 'identity-v2';
const LEGACY_KEY_ID = 'identity';
const DB_VERSION = 2;

type StoredIdentity = {
  publicKeyB64: string;
  privateKeyB64: string;
};

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetIdentity(): Promise<StoredIdentity | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(KEY_ID);
    req.onsuccess = () => {
      const v = req.result as StoredIdentity | CryptoKeyPair | undefined;
      if (!v) return resolve(null);
      if (typeof v === 'object' && 'publicKeyB64' in v && 'privateKeyB64' in v) {
        return resolve(v);
      }
      resolve(null);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbSetIdentity(identity: StoredIdentity): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(identity, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClearIdentityV2(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportPublicKeyB64(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('spki', publicKey);
  return bufToB64(raw);
}

export async function exportPrivateKeyB64(privateKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('pkcs8', privateKey);
  return bufToB64(raw);
}

export async function importPublicKeyB64(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    b64ToBuf(b64),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

export async function importPrivateKeyB64(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    b64ToBuf(b64),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

async function pairFromStored(identity: StoredIdentity): Promise<CryptoKeyPair> {
  const [publicKey, privateKey] = await Promise.all([
    importPublicKeyB64(identity.publicKeyB64),
    importPrivateKeyB64(identity.privateKeyB64),
  ]);
  return { publicKey, privateKey };
}

async function generateExtractablePair(): Promise<StoredIdentity> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveKey',
    'deriveBits',
  ]);
  const [publicKeyB64, privateKeyB64] = await Promise.all([
    exportPublicKeyB64(pair.publicKey),
    exportPrivateKeyB64(pair.privateKey),
  ]);
  return { publicKeyB64, privateKeyB64 };
}

async function pushIdentityToServer(identity: StoredIdentity): Promise<void> {
  const res = await fetch('/api/messages/e2e-key', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: identity.publicKeyB64,
      privateKey: identity.privateKeyB64,
    }),
  });
  if (!res.ok) throw new Error('Failed to sync chat keys');
}

/** Publish public key only and clear any sealed private backup (avoids mismatched pairs). */
async function pushPublicKeyOnly(publicKeyB64: string): Promise<void> {
  const res = await fetch('/api/messages/e2e-key', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: publicKeyB64, clearPrivateBackup: true }),
  });
  if (!res.ok) throw new Error('Failed to sync chat public key');
}

async function pullIdentityFromServer(): Promise<StoredIdentity | null> {
  const res = await fetch('/api/messages/e2e-key', { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { publicKey?: string | null; privateKey?: string | null };
  if (!data.publicKey || !data.privateKey) return null;
  return { publicKeyB64: data.publicKey, privateKeyB64: data.privateKey };
}

async function idbGetLegacyPair(): Promise<CryptoKeyPair | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(LEGACY_KEY_ID);
    req.onsuccess = () => {
      const v = req.result as CryptoKeyPair | StoredIdentity | undefined;
      if (v && typeof v === 'object' && 'privateKey' in v && 'publicKey' in v) {
        resolve(v as CryptoKeyPair);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Ensure this browser has the account identity keypair.
 * Prefers existing browser keys that can decrypt history; syncs extractable
 * backups to the server for other devices when possible.
 */
export async function ensureLocalKeyPair(): Promise<{ publicKeyB64: string; pair: CryptoKeyPair }> {
  // Legacy CryptoKeyPair from before multi-device sync. Never replace these —
  // minting a new pair makes all existing ciphertext undecryptable.
  const legacy = await idbGetLegacyPair();
  if (legacy) {
    const publicKeyB64 = await exportPublicKeyB64(legacy.publicKey);
    try {
      const privateKeyB64 = await exportPrivateKeyB64(legacy.privateKey);
      const identity = { publicKeyB64, privateKeyB64 };
      await idbSetIdentity(identity);
      try {
        await pushIdentityToServer(identity);
      } catch {
        /* offline */
      }
      return { publicKeyB64, pair: legacy };
    } catch {
      // Non-extractable: keep using this device's keys; drop any mismatched v2 backup.
      try {
        await idbClearIdentityV2();
      } catch {
        /* ignore */
      }
      try {
        await pushPublicKeyOnly(publicKeyB64);
      } catch {
        /* offline */
      }
      return { publicKeyB64, pair: legacy };
    }
  }

  let local = await idbGetIdentity();
  let remote: StoredIdentity | null = null;
  try {
    remote = await pullIdentityFromServer();
  } catch {
    remote = null;
  }

  // Canonical account key from server (other devices / restored browsers).
  if (remote) {
    if (!local || local.publicKeyB64 !== remote.publicKeyB64) {
      await idbSetIdentity(remote);
      local = remote;
    }
    const pair = await pairFromStored(local);
    return { publicKeyB64: local.publicKeyB64, pair };
  }

  if (local) {
    try {
      await pushIdentityToServer(local);
    } catch {
      /* offline */
    }
    const pair = await pairFromStored(local);
    return { publicKeyB64: local.publicKeyB64, pair };
  }

  local = await generateExtractablePair();
  await idbSetIdentity(local);
  try {
    await pushIdentityToServer(local);
  } catch {
    /* offline — will retry next visit */
  }

  const pair = await pairFromStored(local);
  return { publicKeyB64: local.publicKeyB64, pair };
}

async function deriveAesKey(myPrivate: CryptoKey, theirPublic: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublic },
    myPrivate,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(
  plaintext: string,
  myPrivate: CryptoKey,
  theirPublicB64: string
): Promise<{ ciphertext: string; iv: string }> {
  const theirPublic = await importPublicKeyB64(theirPublicB64);
  const aes = await deriveAesKey(myPrivate, theirPublic);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, encoded);
  return { ciphertext: bufToB64(cipher), iv: bufToB64(iv.buffer) };
}

export async function decryptMessage(
  ciphertextB64: string,
  ivB64: string,
  myPrivate: CryptoKey,
  theirPublicB64: string
): Promise<string> {
  const theirPublic = await importPublicKeyB64(theirPublicB64);
  const aes = await deriveAesKey(myPrivate, theirPublic);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(ivB64)) },
    aes,
    b64ToBuf(ciphertextB64)
  );
  return new TextDecoder().decode(plain);
}

/** Shared AES key for group chats (exportable raw for wrapping). */
export async function generateGroupAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportGroupKeyRawB64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufToB64(raw);
}

export async function importGroupKeyRawB64(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', b64ToBuf(b64), { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/** Wrap group AES key for a peer via ECDH (stores JSON with wrapper public key). */
export async function wrapGroupKeyForPeer(
  groupKeyRawB64: string,
  myPrivate: CryptoKey,
  myPublicB64: string,
  theirPublicB64: string
): Promise<string> {
  const theirPublic = await importPublicKeyB64(theirPublicB64);
  const aes = await deriveAesKey(myPrivate, theirPublic);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aes,
    b64ToBuf(groupKeyRawB64)
  );
  return JSON.stringify({
    iv: bufToB64(iv.buffer),
    ciphertext: bufToB64(cipher),
    wrapperPublicKey: myPublicB64,
  });
}

export async function unwrapGroupKey(
  wrappedJson: string,
  myPrivate: CryptoKey
): Promise<CryptoKey> {
  const parsed = JSON.parse(wrappedJson) as {
    iv: string;
    ciphertext: string;
    wrapperPublicKey: string;
  };
  const wrapperPublic = await importPublicKeyB64(parsed.wrapperPublicKey);
  const aes = await deriveAesKey(myPrivate, wrapperPublic);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(parsed.iv)) },
    aes,
    b64ToBuf(parsed.ciphertext)
  );
  return importGroupKeyRawB64(bufToB64(plain));
}

export async function encryptWithGroupKey(
  plaintext: string,
  groupKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, groupKey, encoded);
  return { ciphertext: bufToB64(cipher), iv: bufToB64(iv.buffer) };
}

export async function decryptWithGroupKey(
  ciphertextB64: string,
  ivB64: string,
  groupKey: CryptoKey
): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(ivB64)) },
    groupKey,
    b64ToBuf(ciphertextB64)
  );
  return new TextDecoder().decode(plain);
}

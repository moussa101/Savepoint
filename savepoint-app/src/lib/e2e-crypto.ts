/**
 * Client-only E2E helpers (Web Crypto).
 * Private keys stay in IndexedDB — the server only ever sees public keys + ciphertext.
 */

const DB_NAME = 'savepoint-e2e';
const STORE = 'keys';
const KEY_ID = 'identity';

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
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<CryptoKeyPair | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(KEY_ID);
    req.onsuccess = () => resolve((req.result as CryptoKeyPair) || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(pair: CryptoKeyPair): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(pair, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportPublicKeyB64(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('spki', publicKey);
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

/** Ensure this browser has an ECDH identity keypair; returns public key (base64 SPKI). */
export async function ensureLocalKeyPair(): Promise<{ publicKeyB64: string; pair: CryptoKeyPair }> {
  let pair = await idbGet();
  if (!pair) {
    pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
      'deriveKey',
      'deriveBits',
    ]);
    await idbSet(pair);
  }
  const publicKeyB64 = await exportPublicKeyB64(pair.publicKey);
  return { publicKeyB64, pair };
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

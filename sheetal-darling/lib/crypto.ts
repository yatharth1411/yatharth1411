/**
 * Device-local AES-GCM encryption for persisted data.
 * A random key is generated per device and stored locally; all app state
 * (memory, chats, notes…) is encrypted before touching localStorage.
 * Privacy-first: nothing leaves the device unless the user enables cloud AI.
 */

const KEY_STORE = "sd_device_key_v1";

let keyPromise: Promise<CryptoKey | null> | null = null;

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey | null> {
  if (typeof window === "undefined" || !globalThis.crypto?.subtle) return null;
  if (!keyPromise) {
    keyPromise = (async () => {
      try {
        const existing = localStorage.getItem(KEY_STORE);
        if (existing) {
          const raw = fromB64(existing);
          return await crypto.subtle.importKey("raw", raw as BufferSource, { name: "AES-GCM" }, true, [
            "encrypt",
            "decrypt",
          ]);
        }
        const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
          "encrypt",
          "decrypt",
        ]);
        const raw = await crypto.subtle.exportKey("raw", key);
        localStorage.setItem(KEY_STORE, toB64(raw));
        return key;
      } catch {
        return null;
      }
    })();
  }
  return keyPromise;
}

/** Returns "v1.<iv>.<ct>" base64 payload, or the original string if crypto unavailable. */
export async function encryptText(plain: string): Promise<string> {
  const key = await getKey();
  if (!key) return plain;
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
    return `v1.${toB64(iv)}.${toB64(ct)}`;
  } catch {
    return plain;
  }
}

export async function decryptText(payload: string): Promise<string> {
  if (!payload.startsWith("v1.")) return payload;
  const key = await getKey();
  if (!key) return payload;
  try {
    const [, ivB64, ctB64] = payload.split(".");
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(ivB64) as BufferSource },
      key,
      fromB64(ctB64) as BufferSource
    );
    return new TextDecoder().decode(pt);
  } catch {
    return "";
  }
}

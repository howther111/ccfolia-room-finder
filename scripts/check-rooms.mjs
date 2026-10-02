import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MISSING_CONFIRMATIONS = Number(process.env.MISSING_CONFIRMATIONS || 2);
const MAX_ROOMS_PER_RUN = Number(process.env.MAX_ROOMS_PER_RUN || 100);
const CHECK_TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS || 30000);
const MISSING_TEXT = 'お探しのルームは見つかりませんでした';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function isValidRoomUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname.toLowerCase() === 'ccfolia.com' &&
      /^\/rooms\/[^/]+\/?$/.test(url.pathname) &&
      !url.username && !url.password && !url.port;
  } catch {
    return false;
  }
}

async function checkRoom(page, room) {
  const response = await page.goto(room.room_url, {
    waitUntil: 'domcontentloaded',
    timeout: CHECK_TIMEOUT_MS
  });

  // SPAの描画を少し待ってからDOMを確認する。
  await page.waitForTimeout(1500);

  const h5Texts = await page.locator('h5').allTextContents();
  const normalized = h5Texts.map(normalizeText);
  const missing = normalized.some((text) => text.includes(MISSING_TEXT));

  return {
    missing,
    status: response?.status() ?? null,
    h5Texts: normalized
  };
}

async function updateStatus(id, status, missingCount) {
  const { error } = await supabase
    .from('rooms')
    .update({
      last_check_status: status,
      last_checked_at: new Date().toISOString(),
      consecutive_not_found: missingCount
    })
    .eq('id', id);

  if (error) throw error;
}

async function deleteRoom(id) {
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

const { data: rooms, error: roomsError } = await supabase
  .from('rooms')
  .select('id,title,room_url,consecutive_not_found')
  .eq('is_public', true)
  .eq('is_approved', true)
  .order('created_at', { ascending: true })
  .limit(MAX_ROOMS_PER_RUN);

if (roomsError) throw roomsError;

console.log(`チェック対象: ${rooms?.length ?? 0}件`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'ja-JP',
  userAgent: 'CCFOLIA-Room-Finder-Monitor/5.0'
});
const page = await context.newPage();

let checked = 0;
let deleted = 0;
let errors = 0;

try {
  for (const room of rooms ?? []) {
    checked += 1;
    console.log(`\\n[${checked}/${rooms.length}] ${room.title} ${room.room_url}`);

    if (!isValidRoomUrl(room.room_url)) {
      console.log('  -> 不正なURLのためスキップ');
      await updateStatus(room.id, 'invalid_url', 0);
      continue;
    }

    try {
      const result = await checkRoom(page, room);

      if (result.missing) {
        const nextCount = Number(room.consecutive_not_found || 0) + 1;
        console.log(`  -> 「${MISSING_TEXT}」を検出 (${nextCount}/${MISSING_CONFIRMATIONS})`);

        if (nextCount >= MISSING_CONFIRMATIONS) {
          await deleteRoom(room.id);
          deleted += 1;
          console.log('  -> 連続確認回数に達したためDBから削除');
        } else {
          await updateStatus(room.id, 'not_found', nextCount);
        }
      } else {
        await updateStatus(room.id, 'ok', 0);
        console.log(`  -> 正常 (${result.status ?? 'status unknown'})`);
      }
    } catch (error) {
      errors += 1;
      console.error(`  -> チェック失敗: ${error.message}`);
      // 通信障害・タイムアウト等では削除候補のカウントを増やさない。
      await updateStatus(room.id, 'check_error', Number(room.consecutive_not_found || 0));
    }
  }
} finally {
  await context.close();
  await browser.close();
}

console.log(`\\n完了: checked=${checked}, deleted=${deleted}, errors=${errors}`);

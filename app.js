/*
 * CCFOLIA ROOM FINDER - v1
 *
 * IMPORTANT:
 * 1. Replace SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY below.
 * 2. Never put a Supabase secret/service_role key in this file.
 */

const SUPABASE_URL = "https://gxhhpcmukjfdgfgffkss.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_0vj2yoC-cnQZGSk_dFOsJQ_hA50kSeB";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (id) => document.getElementById(id);

function generateDeletionToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
 * Client-side CCFOLIA URL validation.
 * Accepted canonical form:
 *   https://ccfolia.com/rooms/{room-id}
 *
 * This checks URL shape/domain only.
 * It does NOT prove that the room currently exists or is public.
 */
function validateCcfoliaUrl(value) {
  try {
    const url = new URL(value.trim());

    if (url.protocol !== "https:") {
      return {
        valid: false,
        message: "HTTPSのURLを指定してください。"
      };
    }

    if (url.hostname.toLowerCase() !== "ccfolia.com") {
      return {
        valid: false,
        message: "ccfolia.com のURLを指定してください。"
      };
    }

    if (url.username || url.password || url.port) {
      return {
        valid: false,
        message: "このURL形式は使用できません。"
      };
    }

    const match = url.pathname.match(/^\/rooms\/([^/]+)\/?$/);

    if (!match) {
      return {
        valid: false,
        message: "ココフォリアのルームURLを指定してください。"
      };
    }

    const roomId = match[1];

    if (roomId.length < 4 || roomId.length > 200) {
      return {
        valid: false,
        message: "ルームIDが不正です。"
      };
    }

    return {
      valid: true,
      roomId,
      canonicalUrl: `https://ccfolia.com/rooms/${roomId}`
    };
  } catch {
    return {
      valid: false,
      message: "URLの形式が正しくありません。"
    };
  }
}

function setUrlMessage(message, type = "") {
  $("urlMessage").textContent = message;
  $("urlMessage").className = `field-message ${type}`.trim();
}

$("roomUrl").addEventListener("input", () => {
  const value = $("roomUrl").value.trim();

  if (!value) {
    setUrlMessage("");
    return;
  }

  const result = validateCcfoliaUrl(value);

  if (result.valid) {
    setUrlMessage("✓ 登録可能なココフォリアURL形式です。", "valid");
  } else {
    setUrlMessage(`✕ ${result.message}`, "invalid");
  }
});

function setFormMessage(message, type = "") {
  $("formMessage").textContent = message;
  $("formMessage").className = `form-message ${type}`.trim();
}

function setDeleteMessage(message, type = "") {
  $("deleteMessage").textContent = message;
  $("deleteMessage").className = `form-message ${type}`.trim();
}

function showDeletionToken(token) {
  document.querySelectorAll(".deletion-token-box").forEach((element) => element.remove());

  const box = document.createElement("div");
  box.className = "deletion-token-box";
  box.innerHTML = `
    <strong>削除キーを保存してください</strong>
    <p>このキーはあとから再表示できません。ルームを削除するときに必要です。</p>
    <code>${escapeHtml(token)}</code>
  `;
  $("formMessage").insertAdjacentElement("afterend", box);
}

function parseTags(value) {
  return [...new Set(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20)
  )];
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(date);
}

function renderRooms(rooms) {
  $("resultCount").textContent = `${rooms.length}件`;

  if (!rooms.length) {
    $("roomList").innerHTML = `
      <div class="empty">
        条件に一致する公開ルームがありません。
      </div>
    `;
    return;
  }

  $("roomList").innerHTML = rooms.map((room) => {
    const tags = Array.isArray(room.tags) ? room.tags : [];

    const tagHtml = tags.map((tag) => `
      <span class="tag">${escapeHtml(tag)}</span>
    `).join("");

    return `
      <article class="room-card">
        <div class="room-card-header">
          <h3>${escapeHtml(room.title)}</h3>
          <span class="system-badge">${escapeHtml(room.system)}</span>
        </div>
        <p class="room-master">ルームマスター：${escapeHtml(room.room_master)}</p>

        ${
          room.description
            ? `<p class="room-description">${escapeHtml(room.description)}</p>`
            : ""
        }

        ${
          tagHtml
            ? `<div class="tags">${tagHtml}</div>`
            : ""
        }

        <div class="room-footer">
          <span class="room-date">
            登録：${escapeHtml(formatDate(room.created_at))}
          </span>

          <a
            class="open-room"
            href="${escapeHtml(room.room_url)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ココフォリアを開く
          </a>
        </div>
      </article>
    `;
  }).join("");
}

function renderPublicRooms(rooms) {
  if (!rooms.length) {
    $("publicRoomList").innerHTML = `
      <div class="empty">現在公開されているルームはありません。</div>
    `;
    return;
  }

  $("publicRoomList").innerHTML = rooms.map((room) => {
    const tags = Array.isArray(room.tags) ? room.tags : [];
    const tagHtml = tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");

    return `
      <article class="room-card">
        <div class="room-card-header">
          <h3>${escapeHtml(room.title)}</h3>
          <span class="system-badge">${escapeHtml(room.system)}</span>
        </div>
        <p class="room-master">ルームマスター：${escapeHtml(room.room_master)}</p>
        ${room.description ? `<p class="room-description">${escapeHtml(room.description)}</p>` : ""}
        ${tagHtml ? `<div class="tags">${tagHtml}</div>` : ""}
        <div class="room-footer">
          <span class="room-date">登録：${escapeHtml(formatDate(room.created_at))}</span>
          <a class="open-room" href="${escapeHtml(room.room_url)}" target="_blank" rel="noopener noreferrer">ココフォリアを開く</a>
        </div>
      </article>
    `;
  }).join("");
}

async function loadPublicRooms() {
  $("publicRoomLoading").hidden = false;
  $("publicRoomLoading").textContent = "読み込み中……";
  $("publicRoomList").innerHTML = "";

  const { data, error } = await supabaseClient
    .from("rooms")
    .select("id,title,room_url,system,room_master,tags,description,created_at")
    .eq("is_public", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(100);

  $("publicRoomLoading").hidden = true;

  if (error) {
    console.error(error);
    $("publicRoomList").innerHTML = `
      <div class="empty">公開ルーム一覧を取得できませんでした。Supabaseの設定とRLSポリシーを確認してください。</div>
    `;
    return;
  }

  renderPublicRooms(data ?? []);
}

async function loadRooms() {
  $("loading").hidden = false;
  $("loading").textContent = "読み込み中……";
  $("roomList").innerHTML = "";

  const keyword = $("keyword").value.trim();
  const system = $("system").value;

  let query = supabaseClient
    .from("rooms")
    .select("id,title,room_url,system,room_master,tags,description,created_at")
    .eq("is_public", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (system) {
    query = query.eq("system", system);
  }

  /*
   * Keyword search:
   * title / description / tags を検索対象にする。
   *
   * Supabase/PostgREST のフィルタ値にカンマや括弧等を含めると
   * 構文上の問題が起こり得るため、まず title/description を検索し、
   * タグ検索は取得後に補助的に行う。
   */
  if (keyword) {
    const safeKeyword = keyword
      .replaceAll("%", "")
      .replaceAll(",", " ")
      .replaceAll("(", " ")
      .replaceAll(")", " ");

    if (safeKeyword.trim()) {
      query = query.or(
        `title.ilike.%${safeKeyword}%,room_master.ilike.%${safeKeyword}%,description.ilike.%${safeKeyword}%`
      );
    }
  }

  const { data, error } = await query;

  $("loading").hidden = true;

  if (error) {
    console.error(error);
    $("roomList").innerHTML = `
      <div class="empty">
        データを取得できませんでした。<br>
        Supabaseの設定とRLSポリシーを確認してください。
      </div>
    `;
    $("resultCount").textContent = "取得エラー";
    return;
  }

  let rooms = data ?? [];

  /*
   * タグもキーワード検索対象にする。
   * DB側でtitle/description検索をした後、タグ一致を追加。
   */
  if (keyword) {
    const lower = keyword.toLocaleLowerCase();

    rooms = rooms.filter((room) => {
      const title = String(room.title ?? "").toLocaleLowerCase();
      const roomMaster = String(room.room_master ?? "").toLocaleLowerCase();
      const description = String(room.description ?? "").toLocaleLowerCase();
      const tags = Array.isArray(room.tags)
        ? room.tags.join(" ").toLocaleLowerCase()
        : "";

      return (
        title.includes(lower) ||
        roomMaster.includes(lower) ||
        description.includes(lower) ||
        tags.includes(lower)
      );
    });
  }

  renderRooms(rooms);
}

$("roomForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormMessage("");

  const title = $("title").value.trim();
  const rawUrl = $("roomUrl").value.trim();
  const system = $("registerSystem").value;
  const tags = parseTags($("tags").value);
  const description = $("description").value.trim();
  const roomMaster = $("roomMaster").value.trim();

  if (!title || !roomMaster || !system) {
    setFormMessage("必須項目を入力してください。", "error");
    return;
  }

  const urlResult = validateCcfoliaUrl(rawUrl);

  if (!urlResult.valid) {
    setFormMessage(urlResult.message, "error");
    setUrlMessage(`✕ ${urlResult.message}`, "invalid");
    return;
  }

  const button = $("registerButton");
  button.disabled = true;
  button.textContent = "登録中……";

  const deletionToken = generateDeletionToken();
  const deletionTokenHash = await sha256Hex(deletionToken);

  const { error } = await supabaseClient
    .from("rooms")
    .insert({
      title,
      room_url: urlResult.canonicalUrl,
      room_master: roomMaster,
      system,
      tags,
      description,
      deletion_token_hash: deletionTokenHash,
      is_public: true,
      is_approved: true
    });

  button.disabled = false;
  button.textContent = "ルームを登録";

  if (error) {
    console.error(error);

    if (error.code === "23505") {
      setFormMessage("このココフォリアルームはすでに登録されています。", "error");
    } else if (error.code === "42501") {
      setFormMessage("登録権限がありません。SupabaseのRLS設定を確認してください。", "error");
    } else {
      setFormMessage("登録に失敗しました。Supabaseの設定を確認してください。", "error");
    }

    return;
  }

  setFormMessage("ルームを登録しました。", "success");
  $("roomForm").reset();
  setUrlMessage("");
  showDeletionToken(deletionToken);

  await loadRooms();
  await loadPublicRooms();
});

$("deleteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  setDeleteMessage("");

  const rawUrl = $("deleteRoomUrl").value.trim();
  const deletionToken = $("deletionToken").value.trim();

  const urlResult = validateCcfoliaUrl(rawUrl);

  if (!urlResult.valid) {
    setDeleteMessage(urlResult.message, "error");
    return;
  }

  if (!deletionToken) {
    setDeleteMessage("削除キーを入力してください。", "error");
    return;
  }

  const button = $("deleteButton");
  button.disabled = true;
  button.textContent = "削除中……";

  const { data, error } = await supabaseClient.rpc("delete_room", {
    p_room_url: urlResult.canonicalUrl,
    p_deletion_token: deletionToken
  });

  button.disabled = false;
  button.textContent = "ルームを削除";

  if (error) {
    console.error(error);
    setDeleteMessage("削除に失敗しました。Supabaseの関数と権限設定を確認してください。", "error");
    return;
  }

  if (!data) {
    setDeleteMessage("削除キーまたはココフォリアURLが一致しません。", "error");
    return;
  }

  setDeleteMessage("ルームを削除しました。", "success");
  $("deleteForm").reset();
  await loadRooms();
  await loadPublicRooms();
});

$("searchButton").addEventListener("click", loadRooms);

$("keyword").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadRooms();
  }
});

$("system").addEventListener("change", loadRooms);
$("refreshPublicRoomsButton").addEventListener("click", loadPublicRooms);

loadRooms();
loadPublicRooms();

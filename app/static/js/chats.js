import { ensureWebSocket, subscribe, sendWS } from "./wsClient.js";

const WS_URL = "ws://127.0.0.1:8000/ws";
const token = localStorage.getItem("access_token");

let chatListEl = null;
let logoutBtn = null;

function renderChats(items) {
  if (!chatListEl) {
    console.warn("chatListEl is null in renderChats");
    return;
  }

  chatListEl.innerHTML = "";

  if (!items || items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "p-12 text-center text-slate-500";
    empty.textContent = "У вас пока нет чатов";
    chatListEl.appendChild(empty);
    return;
  }

  for (const chat of items) {
    const a = document.createElement("a");
    a.href = "#";
    a.dataset.chatId = chat.id;
    a.className =
      "flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-[#020617] transition-colors cursor-pointer";

    const avatar = document.createElement("div");
    avatar.className =
      "h-12 w-12 rounded-full bg-slate-100 dark:bg-[#1f2937] flex items-center justify-center text-primary font-bold text-base flex-shrink-0";
    avatar.textContent = (chat.companion_name || chat.companion_id || "?")
      .slice(0, 2)
      .toUpperCase();

    const content = document.createElement("div");
    content.className = "flex-1 min-w-0";

    const rowTop = document.createElement("div");
    rowTop.className = "flex items-center justify-between gap-2";

    const nameEl = document.createElement("p");
    nameEl.className =
      "text-base font-semibold text-slate-900 dark:text-white truncate";
    nameEl.textContent = chat.companion_name || chat.companion_id;

    rowTop.appendChild(nameEl);

    if (chat.last_message_at) {
      const timeEl = document.createElement("p");
      timeEl.className =
        "text-xs text-slate-500 dark:text-[#9ca3af] flex-shrink-0";
      timeEl.textContent = chat.last_message_at;
      rowTop.appendChild(timeEl);
    }

    const lastMsgEl = document.createElement("p");
    lastMsgEl.className =
      "text-sm text-slate-500 dark:text-[#9ca3af] truncate mt-0.5";
    lastMsgEl.textContent = chat.last_message || "Пока нет сообщений";

    content.appendChild(rowTop);
    content.appendChild(lastMsgEl);

    a.appendChild(avatar);
    a.appendChild(content);

    a.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = `/chats/${chat.id}`;
    });

    chatListEl.appendChild(a);
  }
}

function updateChatPreview(message) {

  const chatItem = chatListEl?.querySelector(`[data-chat-id="${message.chat_id}"]`);
  if (!chatItem) {

    return;
  }

  // обновить текст последнего сообщения
  const lastMsgEl = chatItem.querySelector("p.text-sm");
  if (lastMsgEl) {
    lastMsgEl.textContent = message.content;
  }

  // обновить время
  let timeEl = chatItem.querySelector("p.text-xs");
  if (!timeEl) {
    // Ищем тот же rowTop, куда ты изначально добавлял время
    const rowTop = chatItem.querySelector(
      "div.flex.items-center.justify-between.gap-2"
    );
    if (rowTop) {
      timeEl = document.createElement("p");
      timeEl.className =
        "text-xs text-slate-500 dark:text-[#9ca3af] flex-shrink-0";
      rowTop.appendChild(timeEl);
    }
  }
   if (timeEl) {
    timeEl.textContent = message.created_at;
  }

  // поднять чат наверх списка
  if (chatListEl && chatItem.parentElement === chatListEl) {
    chatListEl.removeChild(chatItem);
    chatListEl.insertBefore(chatItem, chatListEl.firstChild);
  }
}


function logoutInit() {
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
            await fetch("/api/v1/auth/logout", {
                method: "POST",
                credentials: "include",
            });
            } catch (e) {
            console.error(e);
            }
            localStorage.removeItem("access_token");
            window.location.href = "/";
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
  chatListEl = document.getElementById("chat-list");
  logoutBtn = document.getElementById("logout-button");

  if (!token) {
    console.error("No access_token found");
    window.location.href = "/";
    return;
  }

  ensureWebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

  sendWS({ action: "get_chats", data: {} });

  subscribe("chats_list", (msg) => {
    if (msg.data && msg.data.items) {
      renderChats(msg.data.items);
    }
  });

  subscribe("chat_message", (msg) => {
    const message = msg.data;
    if (!message || !message.chat_id) return;
    updateChatPreview(message);
  });

  logoutInit();
});
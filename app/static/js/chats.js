import { ensureWebSocket, subscribe, sendWS } from "./wsClient.js";
import { formatSmartDateTime } from "./utils/datetime.js";

const WS_URL = "ws://127.0.0.1:8000/ws";
const token = localStorage.getItem("access_token");

let chatListEl = null;
let logoutBtn = null;
let chatSearchInput = null; 

let allChats = [];

let createChatModal = null;
let contactsListEl = null;
let contactsSearchInput = null;
let cachedContacts = [];

function renderChats(items) {
  if (!chatListEl) return;
  chatListEl.innerHTML = "";

  if (!items || items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "p-12 text-center text-slate-500";
    empty.textContent = "Чаты не найдены";
    chatListEl.appendChild(empty);
    return;
  }

  const sorted = [...items].sort((a, b) => {
    const aTime = a.last_message_at;
    const bTime = b.last_message_at;
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return new Date(bTime) - new Date(aTime);
  });

  for (const chat of sorted) {
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
      timeEl.textContent = formatSmartDateTime(chat.last_message_at);
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

function filterAndRenderChats() {
  const query = chatSearchInput ? chatSearchInput.value.toLowerCase().trim() : "";
  
  if (!query) {
    renderChats(allChats);
    return;
  }

  const filtered = allChats.filter(chat => {
    const name = (chat.companion_name || "").toLowerCase();
    return name.includes(query); 
  });

  renderChats(filtered);
}

function updateChatPreview(message) {
  const chatIndex = allChats.findIndex(c => c.id === message.chat_id);
  
  if (chatIndex === -1) {
    sendWS({ action: "get_chats", data: {} });
    return;
  }

  const chat = allChats[chatIndex];
  chat.last_message = message.content;
  chat.last_message_at = message.created_at;

  filterAndRenderChats();
}

function handleChatCreated(chat) {
  const existingIndex = allChats.findIndex(c => c.id === chat.id);
  
  if (existingIndex !== -1) {
    allChats[existingIndex] = chat;
  } else {
    allChats.push(chat);
  }

  filterAndRenderChats();
}

async function loadContacts() {
  if (!contactsListEl) return;
  contactsListEl.innerHTML = '<div class="p-4 text-center text-slate-500 text-sm">Загрузка контактов...</div>';

  try {
    const res = await fetch("/api/v1/contacts/", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Ошибка загрузки контактов");
    cachedContacts = await res.json();
    renderContactsInModal(cachedContacts);

  } catch (e) {
    console.error(e);
    contactsListEl.innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Не удалось загрузить контакты</div>';
  }
}

function renderContactsInModal(contacts) {
  if (!contactsListEl) return;
  contactsListEl.innerHTML = "";

  if (!contacts || contacts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "flex flex-col items-center justify-center py-10 text-slate-500";
    empty.innerHTML = `
      <span class="material-symbols-outlined text-4xl mb-2 opacity-50">person_off</span>
      <p class="text-sm">Контакты не найдены</p>
    `;
    contactsListEl.appendChild(empty);
    return;
  }

  const listContainer = document.createElement("div");
  listContainer.className = "space-y-0.5";

  for (const contact of contacts) {
    const btn = document.createElement("button");
    btn.className = "w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group text-left";
    const initials = (contact.name || "?").slice(0, 2).toUpperCase();
    const avatarHtml = `
      <div class="shrink-0">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-primary font-bold text-lg">
           ${initials}
        </div>
      </div>
    `;
    btn.innerHTML = `
      ${avatarHtml}
      <div class="flex-1 min-w-0 border-b border-slate-100 dark:border-slate-800/50 pb-2 group-hover:border-transparent">
          <p class="text-base font-semibold text-slate-900 dark:text-white truncate">
             ${contact.name}
          </p>
      </div>
    `;

    btn.addEventListener("click", () => {
      sendWS({
        action: "create_chat",
        data: { companion_id: contact.contact_id }
      });
      closeModal();
      window.location.href = `/chats/${chat.id}`;
    });

    listContainer.appendChild(btn);
  }
  contactsListEl.appendChild(listContainer);
}

function openModal() {
  if (createChatModal) {
    createChatModal.classList.remove("hidden");
    if (contactsSearchInput) contactsSearchInput.value = "";
    loadContacts();
  }
}

function closeModal() {
  if (createChatModal) {
    createChatModal.classList.add("hidden");
  }
}

function initModal() {
  createChatModal = document.getElementById("create-chat-modal");
  contactsListEl = document.getElementById("contacts-list");
  contactsSearchInput = document.getElementById("contacts-search-input");

  const createBtn = document.getElementById("create-chat-button");
  if (createBtn) createBtn.addEventListener("click", openModal);

  const contactsBtn = document.getElementById("contacts-button");
  if (contactsBtn) {
    contactsBtn.addEventListener("click", () => {
       window.location.href = "/contacts";
    });
  }

  const closeBtn = document.getElementById("close-modal-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  if (contactsSearchInput) {
    contactsSearchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = cachedContacts.filter(c =>
         c.name.toLowerCase().includes(query)
      );
      renderContactsInModal(filtered);
    });
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
  chatSearchInput = document.getElementById("chat-search"); 

  if (!token) {
    console.error("No access_token found");
    window.location.href = "/";
    return;
  }

  ensureWebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

  sendWS({ action: "get_chats", data: {} });

  subscribe("chats_list", (msg) => {
    if (msg.data && msg.data.items) {
      allChats = msg.data.items; 
      filterAndRenderChats(); 
    }
  });

  subscribe("chat_message", (msg) => {
    const message = msg.data;
    if (!message || !message.chat_id) return;
    updateChatPreview(message);
  });

  subscribe("chat_created", (msg) => {
    const chat = msg.data;
    if (!chat || !chat.id) return;
    handleChatCreated(chat);
  });

  if (chatSearchInput) {
    chatSearchInput.addEventListener("input", () => {
      filterAndRenderChats();
    });
  }

  logoutInit();
  initModal();
});

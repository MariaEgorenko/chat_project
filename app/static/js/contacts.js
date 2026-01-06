import { ensureWebSocket, subscribe, sendWS } from "./wsClient.js";

const WS_URL = "ws://127.0.0.1:8000/ws";
const token = localStorage.getItem("access_token");

let contactsContainer = null;
let contactsListSearch = null;
let openModalBtn = null;
let logoutBtn = null;
let notificationsBtn = null;

let searchModal = null;
let closeSearchModalBtn = null;
let globalSearchInput = null;
let globalSearchResults = null;

let successModal = null;
let closeSuccessModalBtn = null;

let existsModal = null;
let closeExistsModalBtn = null;

let addedModal = null;
let closeAddedModalBtn = null;

let notificationsModal = null;
let closeNotificationsBtn = null;
let tabIncoming = null;
let tabOutgoing = null;
let notificationsList = null;

let myContacts = [];

let outgoingRequests = []; 
let outgoingRequestsSet = new Set(); 

let pendingRequests = []; 
let pendingRequestsSet = new Set(); 

let searchTimeout = null;

let activeTab = "incoming"; 

async function fetchMyContacts() {
  try {
    const res = await fetch("/api/v1/contacts/", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load contacts");
    myContacts = await res.json();
    renderMyContacts(myContacts);
  } catch (err) {
    console.error(err);
    if (contactsContainer) {
        contactsContainer.innerHTML = '<div class="p-10 text-center text-red-500">Ошибка загрузки контактов</div>';
    }
  }
}

async function searchUsersGlobal(query) {
  try {
    const res = await fetch(`/api/v1/contacts/search?q=${encodeURIComponent(query)}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Search failed");
    
    const foundUsers = await res.json();
    // Исключаем тех, кто уже в контактах
    const existingContactIds = new Set(myContacts.map(c => c.contact_id));
    const filteredUsers = foundUsers.filter(user => !existingContactIds.has(user.id));

    renderGlobalSearchResults(filteredUsers);

  } catch (err) {
    console.error(err);
    if (globalSearchResults) {
        globalSearchResults.innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Ошибка поиска</div>';
    }
  }
}

// Хелпер для обновления текущего поиска (при закрытии модалок)
function refreshSearch() {
    if (searchModal && !searchModal.classList.contains("hidden") && globalSearchInput) {
        const query = globalSearchInput.value.trim();
        if (query.length > 0) {
            searchUsersGlobal(query);
        }
    }
}

function renderMyContacts(items) {
  if (!contactsContainer) return;
  contactsContainer.innerHTML = "";

  if (!items || items.length === 0) {
    contactsContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20 text-slate-500">
        <span class="material-symbols-outlined text-6xl mb-4 opacity-30">person_off</span>
        <p class="text-lg font-medium">Список контактов пуст</p>
      </div>
    `;
    return;
  }

  items.forEach(contact => {
    const el = document.createElement("div");
    el.className = "flex items-center gap-4 py-3.5 px-6 hover:bg-slate-50 dark:hover:bg-[#1a2233] transition-colors cursor-pointer group";
    const displayName = contact.name || "Unknown";
    const initials = displayName.slice(0, 2).toUpperCase();
    
    el.innerHTML = `
        <div class="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary font-bold text-base flex-shrink-0">
            ${initials}
        </div>
        <div class="flex-1 min-w-0">
            <p class="text-base font-semibold text-slate-900 dark:text-white truncate">${displayName}</p>
        </div>
        <button class="p-2 rounded-full text-slate-400 hover:text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
             <span class="material-symbols-outlined">chat_bubble</span>
        </button>
    `;

    el.addEventListener("click", () => {
        sendWS({
            action: "create_chat",
            data: { companion_id: contact.contact_id }
        });
    });

    contactsContainer.appendChild(el);
  });
}

function renderGlobalSearchResults(users) {
  if (!globalSearchResults) return;
  globalSearchResults.innerHTML = "";

  if (!users || users.length === 0) {
    globalSearchResults.innerHTML = `
      <div class="flex flex-col items-center justify-center pt-10 text-slate-500">
         <p class="text-sm">Пользователи не найдены</p>
         <p class="text-xs text-slate-400 mt-1">(или уже добавлены)</p>
      </div>
    `;
    return;
  }

  const list = document.createElement("div");
  list.className = "space-y-1";

  users.forEach(user => {
    const btn = document.createElement("button");
    btn.className = "w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group text-left";
    const initials = (user.name || user.login).slice(0, 2).toUpperCase();
    
    // Проверка статусов
    const isOutgoing = outgoingRequestsSet.has(user.id);
    const isIncoming = pendingRequestsSet.has(user.id);

    let icon = "person_add";
    let iconClass = "text-slate-400 group-hover:text-primary";
    let statusText = "";

    if (isOutgoing) {
        icon = "pending";
        iconClass = "text-yellow-500";
    } else if (isIncoming) {
        icon = "person_add_alt"; // Иконка "Принять/Добавить ответно"
        iconClass = "text-green-500";
        statusText = " (входящая заявка)";
    }
    
    btn.innerHTML = `
      <div class="shrink-0">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold text-sm">
           ${initials}
        </div>
      </div>
      <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">
             ${user.name}<span class="text-xs font-normal text-green-600 dark:text-green-400">${statusText}</span>
          </p>
          <p class="text-xs text-slate-500 truncate">@${user.login}</p>
      </div>
      <span class="material-symbols-outlined ${iconClass} text-[20px]">${icon}</span>
    `;

    btn.addEventListener("click", () => {
      if (isOutgoing) {
          // Если уже отправили - показываем "Уже есть"
          openExistsModal();
      } else if (isIncoming) {
          // Если есть входящая - ПРИНИМАЕМ ЗАЯВКУ
          // Находим ID заявки по ID пользователя
          const req = pendingRequests.find(r => r.from_user === user.id);
          if (req) {
              sendWS({
                  action: "accept_contact_request",
                  data: { request_id: req.id }
              });
          }
      } else {
          // Обычная отправка
          sendWS({ action: "send_contact_request", data: { to_user_id: user.id } });
      }
    });

    list.appendChild(btn);
  });
  globalSearchResults.appendChild(list);
}

function renderNotifications() {
    if (!notificationsList) return;
    notificationsList.innerHTML = "";

    const items = activeTab === "incoming" ? pendingRequests : outgoingRequests;
    const emptyText = activeTab === "incoming" ? "Нет входящих заявок" : "Нет исходящих заявок";

    if (!items || items.length === 0) {
        notificationsList.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-slate-400">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-30">inbox</span>
                <p class="text-sm">${emptyText}</p>
            </div>
        `;
        return;
    }

    const listContainer = document.createElement("div");
    listContainer.className = "space-y-2";

    items.forEach(req => {
        const name = activeTab === "incoming" ? req.from_user_name : req.to_user_name;
        const initials = (name || "?").slice(0, 2).toUpperCase();
        
        const itemEl = document.createElement("div");
        itemEl.className = "flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg";
        
        const statusIcon = activeTab === "incoming" 
            ? '<span class="material-symbols-outlined text-blue-500 text-xl">call_received</span>'
            : '<span class="material-symbols-outlined text-yellow-500 text-xl">call_made</span>';

        let actionsHtml = "";
        
        if (activeTab === "incoming") {
            actionsHtml = `
               <div class="flex gap-2">
                 <button class="btn-accept w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors" title="Принять">
                    <span class="material-symbols-outlined text-[18px]">check</span>
                 </button>
                 <button class="btn-reject w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors" title="Отклонить">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                 </button>
               </div>
            `;
        } else {
             actionsHtml = `
               <div class="text-xs text-slate-400 italic">Ожидание</div>
             `;
        }

        itemEl.innerHTML = `
            <div class="shrink-0">
               <div class="w-10 h-10 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  ${initials}
               </div>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-900 dark:text-white truncate">${name}</p>
                <div class="flex items-center gap-1 text-xs text-slate-500">
                    ${statusIcon}
                    <span>${activeTab === "incoming" ? "Входящая" : "Исходящая"}</span>
                </div>
            </div>
            ${actionsHtml}
        `;

        if (activeTab === "incoming") {
            const acceptBtn = itemEl.querySelector(".btn-accept");
            const rejectBtn = itemEl.querySelector(".btn-reject");

            if(rejectBtn) {
                rejectBtn.addEventListener("click", () => {
                    sendWS({ action: "reject_contact_request", data: { request_id: req.id } });
                });
            }
            if(acceptBtn) {
                acceptBtn.addEventListener("click", () => {
                    sendWS({ action: "accept_contact_request", data: { request_id: req.id } });
                });
            }
        }

        listContainer.appendChild(itemEl);
    });

    notificationsList.appendChild(listContainer);
}

function updateTabStyles() {
    if (!tabIncoming || !tabOutgoing) return;
    const activeClass = ["border-primary", "text-primary"];
    const inactiveClass = ["border-transparent", "text-slate-500", "dark:text-slate-400"];
    if (activeTab === "incoming") {
        tabIncoming.classList.add(...activeClass);
        tabIncoming.classList.remove("border-transparent", "text-slate-500");
        tabOutgoing.classList.remove(...activeClass);
        tabOutgoing.classList.add(...inactiveClass);
    } else {
        tabOutgoing.classList.add(...activeClass);
        tabOutgoing.classList.remove("border-transparent", "text-slate-500");
        tabIncoming.classList.remove(...activeClass);
        tabIncoming.classList.add(...inactiveClass);
    }
}

function openSearchModal() {
  if (searchModal) {
    searchModal.classList.remove("hidden");
    sendWS({ action: "get_outgoing_requests", data: {} });
    sendWS({ action: "get_pending_requests", data: {} }); // Чтобы обновить иконки входящих
    if (globalSearchInput) {
        globalSearchInput.value = "";
        globalSearchInput.focus();
    }
    if (globalSearchResults) {
        globalSearchResults.innerHTML = `
             <div class="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-30">search</span>
                <p>Введите запрос для поиска</p>
             </div>
        `;
    }
  }
}
function closeSearchModal() { if (searchModal) searchModal.classList.add("hidden"); }

function openSuccessModal() { if (successModal) successModal.classList.remove("hidden"); }
function closeSuccessModal() { 
    if (successModal) successModal.classList.add("hidden"); 
    refreshSearch(); // Обновляем поиск при закрытии
}

function openExistsModal() { if (existsModal) existsModal.classList.remove("hidden"); }
function closeExistsModal() { 
    if (existsModal) existsModal.classList.add("hidden"); 
    refreshSearch();
}

function openAddedModal() { if (addedModal) addedModal.classList.remove("hidden"); }
function closeAddedModal() { 
    if (addedModal) addedModal.classList.add("hidden"); 
    refreshSearch(); 
    fetchMyContacts();
}

function openNotificationsModal() {
    if (notificationsModal) {
        notificationsModal.classList.remove("hidden");
        sendWS({ action: "get_pending_requests", data: {} });
        sendWS({ action: "get_outgoing_requests", data: {} });
        renderNotifications();
    }
}
function closeNotificationsModal() {
    if (notificationsModal) notificationsModal.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    window.location.href = "/";
    return;
  }

  contactsContainer = document.getElementById("contacts-container");
  contactsListSearch = document.getElementById("contacts-list-search");
  openModalBtn = document.getElementById("open-add-contact-modal-btn");
  logoutBtn = document.getElementById("logout-button");
  notificationsBtn = document.getElementById("notifications-btn");

  searchModal = document.getElementById("add-contact-modal");
  closeSearchModalBtn = document.getElementById("close-modal-btn");
  globalSearchInput = document.getElementById("global-user-search-input");
  globalSearchResults = document.getElementById("global-search-results");

  successModal = document.getElementById("request-sent-modal");
  closeSuccessModalBtn = document.getElementById("close-success-modal-btn");

  existsModal = document.getElementById("request-exists-modal");
  closeExistsModalBtn = document.getElementById("close-exists-modal-btn");

  addedModal = document.getElementById("contact-added-modal");
  closeAddedModalBtn = document.getElementById("close-added-modal-btn");

  notificationsModal = document.getElementById("notifications-modal");
  closeNotificationsBtn = document.getElementById("close-notifications-btn");
  tabIncoming = document.getElementById("tab-incoming");
  tabOutgoing = document.getElementById("tab-outgoing");
  notificationsList = document.getElementById("notifications-list");

  ensureWebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

  setTimeout(() => {
     sendWS({ action: "get_outgoing_requests", data: {} });
     sendWS({ action: "get_pending_requests", data: {} });
  }, 1000);
  
  subscribe("chat_created", (msg) => {
    if (msg.data && msg.data.id) window.location.href = `/chats/${msg.data.id}`;
  });

  subscribe("outgoing_requests", (msg) => {
      outgoingRequestsSet.clear();
      outgoingRequests = [];
      if (msg.data && Array.isArray(msg.data.items)) {
          outgoingRequests = msg.data.items;
          msg.data.items.forEach(req => outgoingRequestsSet.add(req.to_user));
      }
      if (notificationsModal && !notificationsModal.classList.contains("hidden") && activeTab === "outgoing") {
          renderNotifications();
      }
  });

  subscribe("pending_requests", (msg) => {
      pendingRequests = [];
      pendingRequestsSet.clear();
      if (msg.data && Array.isArray(msg.data.items)) {
          pendingRequests = msg.data.items;
          msg.data.items.forEach(req => pendingRequestsSet.add(req.from_user));
      }
      refreshSearch();

      if (notificationsModal && !notificationsModal.classList.contains("hidden") && activeTab === "incoming") {
          renderNotifications();
      }
  });

  subscribe("contact_request_sent", (msg) => {
     sendWS({ action: "get_outgoing_requests", data: {} });
     openSuccessModal();
  });

  subscribe("contact_request", (msg) => {
      sendWS({ action: "get_pending_requests", data: {} });
  });

  subscribe("contact_request_rejected", (msg) => {
      const rejectedId = msg.data.id;
      pendingRequests = pendingRequests.filter(req => req.id !== rejectedId);
      if (notificationsModal && !notificationsModal.classList.contains("hidden") && activeTab === "incoming") {
          renderNotifications();
      }
      sendWS({ action: "get_pending_requests", data: {} }); 
  });

  subscribe("contact_request_accepted_notification", (msg) => {
      fetchMyContacts();
      sendWS({ action: "get_outgoing_requests", data: {} });
      refreshSearch();
  });

  subscribe("contact_request_accepted", (msg) => {
      
      sendWS({ action: "get_pending_requests", data: {} });
      fetchMyContacts(); // Обновляем главный список контактов
      
      if (notificationsModal && !notificationsModal.classList.contains("hidden")) {
         renderNotifications();
      }
      
      openAddedModal();
  });


  fetchMyContacts();

  if (openModalBtn) openModalBtn.addEventListener("click", openSearchModal);
  
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

  if (notificationsBtn) {
      notificationsBtn.addEventListener("click", openNotificationsModal);
  }

  if (tabIncoming) {
      tabIncoming.addEventListener("click", () => {
          activeTab = "incoming";
          updateTabStyles();
          renderNotifications();
      });
  }
  if (tabOutgoing) {
      tabOutgoing.addEventListener("click", () => {
          activeTab = "outgoing";
          updateTabStyles();
          renderNotifications();
      });
  }

  if (closeSearchModalBtn) closeSearchModalBtn.addEventListener("click", closeSearchModal);
  if (closeSuccessModalBtn) closeSuccessModalBtn.addEventListener("click", closeSuccessModal);
  if (closeExistsModalBtn) closeExistsModalBtn.addEventListener("click", closeExistsModal);
  if (closeAddedModalBtn) closeAddedModalBtn.addEventListener("click", closeAddedModal);
  if (closeNotificationsBtn) closeNotificationsBtn.addEventListener("click", closeNotificationsModal);

  if (searchModal) searchModal.querySelector(".bg-slate-900\\/40")?.addEventListener("click", closeSearchModal);
  if (notificationsModal) notificationsModal.querySelector(".bg-slate-900\\/40")?.addEventListener("click", closeNotificationsModal);

  if (contactsListSearch) {
    contactsListSearch.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = myContacts.filter(c => (c.name && c.name.toLowerCase().includes(q)));
        renderMyContacts(filtered);
    });
  }
  
  if (globalSearchInput) {
    globalSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);
        if (query.length === 0) {
            if (globalSearchResults) {
                globalSearchResults.innerHTML = `
                     <div class="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                        <span class="material-symbols-outlined text-4xl mb-2 opacity-30">search</span>
                        <p>Введите запрос для поиска</p>
                     </div>
                `;
            }
            return;
        }
        searchTimeout = setTimeout(() => {
            searchUsersGlobal(query);
        }, 300);
    });
  }
});

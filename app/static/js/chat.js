import { ensureWebSocket, subscribe, sendWS } from "./wsClient.js";
import { formatSmartDateTime } from "./utils/datetime.js";

const WS_URL = "ws://127.0.0.1:8000/ws";
const token = localStorage.getItem("access_token");

let messagesContainer = null;
let messageForm = null;
let messageInput = null;
let chatId = null;

// Переменные для пагинации
let offset = 0;
const limit = 50;
let isLoadingHistory = false;
let allHistoryLoaded = false; // Флаг, что больше сообщений нет

function scrollToBottom() {
  if (messagesContainer) {
    // Используем setTimeout, чтобы DOM успел обновиться
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 0);
  }
}

// Отправка запроса на получение истории
function loadMessages() {
  if (isLoadingHistory || allHistoryLoaded) return;

  isLoadingHistory = true;

  // Показываем индикатор загрузки (опционально можно добавить спиннер в HTML)
  // console.log("Loading messages, offset:", offset);

  sendWS({
    action: "get_chat_messages",
    data: { 
        chat_id: chatId,
        limit: limit,
        offset: offset
    },
  });
}

function renderHistory(messages) {
  if (!messagesContainer) return;

  // Если сообщений пришло меньше, чем лимит, значит это конец истории
  if (messages.length < limit) {
    allHistoryLoaded = true;
  }

  // Запоминаем текущую высоту и позицию скролла ДО вставки новых элементов
  const oldScrollHeight = messagesContainer.scrollHeight;
  const oldScrollTop = messagesContainer.scrollTop;

  // Так как сообщения приходят от новых к старым (обычно в SQL DESC), 
  // или от старых к новым (ASC), нужно понимать порядок.
  // В чатах обычно сервер отдает: [msg_offset_0, msg_offset_1, ...].
  // Если у вас сервер отдает от старых к новым (ASC), то порядок правильный.
  // Если от новых к старым (DESC), массив нужно развернуть: messages.reverse().
  // Предположим, сервер возвращает хронологически (от старых к новым).
  
  // Создаем фрагмент, чтобы не дергать DOM на каждом сообщении
  const fragment = document.createDocumentFragment();

  for (const m of messages) {
     const el = createMessageElement(m);
     fragment.appendChild(el);
  }

  if (offset === 0) {
    // Первая загрузка: просто добавляем всё и скроллим вниз
    messagesContainer.innerHTML = ""; // Очищаем на всякий случай
    messagesContainer.appendChild(fragment);
    scrollToBottom();
  } else {
    // Подгрузка истории: добавляем В НАЧАЛО (prepend)
    messagesContainer.insertBefore(fragment, messagesContainer.firstChild);

    // КОРРЕКЦИЯ СКРОЛЛА
    // Нам нужно сместить скролл вниз ровно на высоту добавленного контента
    const newScrollHeight = messagesContainer.scrollHeight;
    messagesContainer.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
  }

  // Увеличиваем оффсет для следующего запроса
  offset += messages.length;
  isLoadingHistory = false;
}

function createMessageElement(m) {
  const isOwn = m.sender_id === m.current_user_id;

  const wrapper = document.createElement("div");
  wrapper.className =
    "flex gap-3 max-w-[85%] sm:max-w-[70%] " +
    (isOwn ? "ml-auto flex-row-reverse" : "");

  const avatar = document.createElement("div");
  avatar.className =
    "h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center " +
    "text-primary font-bold text-xs flex-shrink-0 mt-auto mb-1";
  
  // Если есть sender_name, берем инициалы, иначе "?"
  avatar.textContent = "?"; 

  const content = document.createElement("div");
  content.className = "flex flex-col gap-1" + (isOwn ? " items-end" : "");

  const bubble = document.createElement("div");
  bubble.className =
    (isOwn
      ? "bg-primary text-white rounded-2xl rounded-br-none"
      : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-none") +
    " p-4 shadow-sm text-sm leading-relaxed break-words"; // break-words важно для длинных строк
  bubble.textContent = m.content;

  const meta = document.createElement("div");
  meta.className = "flex items-center gap-1" + (isOwn ? "" : " ml-1");

  const timeEl = document.createElement("span");
  timeEl.className = "text-xs text-slate-400 font-medium";
  timeEl.textContent = m.created_at
    ? formatSmartDateTime(m.created_at)
    : "";

  meta.appendChild(timeEl);

  content.appendChild(bubble);
  content.appendChild(meta);

  // if (!isOwn) {
  //   wrapper.appendChild(avatar);
  // }
  wrapper.appendChild(content);

  return wrapper;
}

// Для одиночного нового сообщения (real-time)
function appendNewMessage(m) {
  if (!messagesContainer) return;
  const el = createMessageElement(m);
  messagesContainer.appendChild(el);
  scrollToBottom();
  
  // Т.к. мы добавили сообщение, нужно сдвинуть оффсет, чтобы не дублировать 
  // при следующей подгрузке, если мы вдруг дойдем до этого места
  offset++; 
}

function initForm() {
  if (!messageForm || !messageInput) return;

  const handleSendMessage = () => {
    const text = messageInput.value.trim();
    if (!text) return;

    sendWS({
      action: "send_chat_message",
      data: {
        chat_id: chatId,
        content: text,
      },
    });

    messageInput.value = "";
  };

  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSendMessage();
  });

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); 
      handleSendMessage();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("chat-root");
  chatId = root ? root.dataset.chatId : null;
  messagesContainer = document.getElementById("messages-container");
  messageForm = document.getElementById("message-form");
  messageInput = document.getElementById("message-input");

  if (!token || !chatId) {
    console.error("No token or chatId");
    window.location.href = "/";
    return;
  }

  ensureWebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

  // Первая загрузка
  loadMessages();

  // Обработчик скролла для пагинации
  if (messagesContainer) {
      messagesContainer.addEventListener("scroll", () => {
          // Если скролл у самого верха (например, меньше 50px от топа)
          if (messagesContainer.scrollTop < 50) {
              loadMessages();
          }
      });
  }

  subscribe("chat_messages", (msg) => {
    if (msg.data && msg.data.messages) {
      // Важно: если сервер возвращает messages в порядке [новые -> старые],
      // то здесь их нужно перевернуть, чтобы в DOM они шли хронологически.
      // Обычно для пагинации удобно получать DESC, поэтому делаем reverse:
      // const sorted = msg.data.messages.reverse(); 
      
      // Если же сервер уже шлет [старые -> новые], то reverse не нужен.
      // Предполагаем, что сервер шлет правильно для append, то есть хронологически.
      renderHistory(msg.data.messages);
    }
  });

  subscribe("chat_message", (msg) => {
    const m = msg.data;
    if (!m || m.chat_id !== chatId) return;
    appendNewMessage(m);
  });

  initForm();
});

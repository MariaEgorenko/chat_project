const WS_URL = "ws://127.0.0.1:8000/ws";
const token = localStorage.getItem("access_token");

let ws = null;
let messagesContainer = null;
let messageForm = null;
let messageInput = null;
let chatId = null;

function ensureWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }
  if (!token || !chatId) {
    console.error("No token or chatId");
    return;
  }

  ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

  ws.onopen = () => {
    // запрос истории чата
    ws.send(
      JSON.stringify({
        action: "get_chat_messages",
        data: { chat_id: chatId },
      })
    );
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      console.error("Invalid WS message", event.data);
      return;
    }

    if (msg.type === "chat_messages" && msg.data && msg.data.messages) {
      renderHistory(msg.data.messages);
    } else if (msg.type === "chat_message" && msg.data) {
      renderMessage(msg.data);
    }
  };

  ws.onclose = () => {
    ws = null;
  };

  ws.onerror = (err) => {
    console.error("WS error", err);
  };
}

function renderHistory(messages) {
  if (!messagesContainer) return;
  messagesContainer.innerHTML = "";
  for (const m of messages) {
    renderMessage(m);
  }
}

function renderMessage(m) {
  if (!messagesContainer) return;

  const wrapper = document.createElement("div");
  const isOwn = m.is_own === true || m.sender_id === m.current_user_id; // подгони под свои данные

  wrapper.className =
    "flex gap-3 max-w-[85%] sm:max-w-[70%] " + (isOwn ? "ml-auto flex-row-reverse" : "");

  const avatar = document.createElement("div");
  avatar.className =
    "h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 mt-auto mb-1";
  avatar.textContent = "?";

  const content = document.createElement("div");
  content.className = "flex flex-col gap-1" + (isOwn ? " items-end" : "");

  const bubble = document.createElement("div");
  bubble.className =
    (isOwn
      ? "bg-primary text-white rounded-2xl rounded-br-none"
      : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-none") +
    " p-4 shadow-sm text-sm leading-relaxed";
  bubble.textContent = m.content;

  const meta = document.createElement("div");
  meta.className = "flex items-center gap-1" + (isOwn ? "" : " ml-1");

  const timeEl = document.createElement("span");
  timeEl.className = "text-xs text-slate-400 font-medium";
  timeEl.textContent = m.created_at || "";

  meta.appendChild(timeEl);

  content.appendChild(bubble);
  content.appendChild(meta);

  wrapper.appendChild(avatar);
  wrapper.appendChild(content);

  messagesContainer.appendChild(wrapper);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function initForm() {
  if (!messageForm || !messageInput) return;

  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(
      JSON.stringify({
        action: "send_chat_message",
        data: {
          chat_id: chatId,
          content: text,
        },
      })
    );
    messageInput.value = "";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("chat-root");
  chatId = root ? root.dataset.chatId : null;
  messagesContainer = document.getElementById("messages-container");
  messageForm = document.getElementById("message-form");
  messageInput = document.getElementById("message-input");

  ensureWebSocket();
  initForm();
});

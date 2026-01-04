// static/js/app.js

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const registerMsg = document.getElementById("register-message");
const loginMsg = document.getElementById("login-message");

const authSection = document.getElementById("auth-section");
const homeSection = document.getElementById("home-section");
const userNameSpan = document.getElementById("user-name");
const wsStatusSpan = document.getElementById("ws-status");
const logoutBtn = document.getElementById("logout-btn");
const wsSendForm = document.getElementById("ws-send-form");
const wsLog = document.getElementById("ws-log");

let accessToken = null;
let ws = null;

// ========== Регистрация ==========

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerMsg.textContent = "";

    const formData = new FormData(registerForm);
    const body = {
        login: formData.get("login"),
        name: formData.get("name"),
        password: formData.get("password"),
    };

    try {
        const res = await fetch("/api/v1/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            registerMsg.style.color = "green";
            registerMsg.textContent = "Регистрация успешна. Теперь войдите.";
            registerForm.reset();
        } else {
            const data = await res.json().catch(() => ({}));
            registerMsg.style.color = "red";
            registerMsg.textContent = data.detail || "Ошибка регистрации";
        }
    } catch (err) {
        registerMsg.style.color = "red";
        registerMsg.textContent = "Ошибка сети";
    }
});

// ========== Авторизация ==========

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.textContent = "";

    const formData = new FormData(loginForm);
    const body = {
        login: formData.get("login"),
        password: formData.get("password"),
    };

    try {
        const res = await fetch("/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            loginMsg.textContent = data.detail || "Ошибка входа";
            return;
        }

        // ожидаем ответ формата { access_token: "...", token_type: "bearer" }
        accessToken = data.access_token;
        userNameSpan.textContent = body.login; // либо бери имя из профиля позже

        authSection.style.display = "none";
        homeSection.style.display = "block";

        connectWS(); // сразу подключаемся к сокету с токеном

    } catch (err) {
        loginMsg.textContent = "Ошибка сети";
    }
});

// ========== Подключение к WebSocket после авторизации ==========

function logWS(message) {
    const now = new Date().toLocaleTimeString();
    wsLog.textContent += `[${now}] ${message}\n`;
    wsLog.scrollTop = wsLog.scrollHeight;
}

function connectWS() {
    if (!accessToken) {
        logWS("Нет accessToken, нельзя подключиться к WS");
        return;
    }

    const url = `ws://${window.location.host}/ws?token=${encodeURIComponent(accessToken)}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
        wsStatusSpan.textContent = "подключен";
        wsStatusSpan.style.color = "green";
        logWS("WS connected");

        // Пример: сразу запросить профиль
        const msg = {
            action: "get_profile",
            data: {},
        };
        ws.send(JSON.stringify(msg));
        logWS("SEND: " + JSON.stringify(msg));
    };

    ws.onmessage = (event) => {
        logWS("RECV: " + event.data);
    };

    ws.onclose = () => {
        wsStatusSpan.textContent = "отключен";
        wsStatusSpan.style.color = "red";
        logWS("WS closed");
    };

    ws.onerror = (event) => {
        logWS("WS error");
    };
}

// ========== Отправка произвольного сообщения по WS (для теста) ==========

wsSendForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert("WebSocket не подключен");
        return;
    }
    const formData = new FormData(wsSendForm);
    const text = formData.get("text") || "";
    // если пользователь ввёл голый текст, просто отправим его как есть
    // или можно ожидать, что он введёт корректный JSON
    ws.send(text);
    logWS("SEND: " + text);
    wsSendForm.reset();
});

// ========== Logout (на твоём бэке можно сделать HTTP-logout, если нужно) ==========

logoutBtn.addEventListener("click", async () => {
    // если есть HTTP logout:
    // await fetch("/api/v1/auth/logout", { method: "POST" });

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
    accessToken = null;
    authSection.style.display = "block";
    homeSection.style.display = "none";
    wsLog.textContent = "";
    wsStatusSpan.textContent = "отключен";
    wsStatusSpan.style.color = "red";
});

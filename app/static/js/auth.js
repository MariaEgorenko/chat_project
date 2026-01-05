const API_BASE = "http://127.0.0.1:8000/api/v1";

const loginInput = document.getElementById("login-input");
const passwordInput = document.getElementById("password-input");
const loginButton = document.getElementById("login-button");
const errorBlock = document.getElementById("login-error");
const registerLink = document.getElementById("register-link");

async function handleLogin() {
    const login = loginInput.value.trim();
    const password = passwordInput.value;

    errorBlock.classList.add("hidden");
    errorBlock.textContent = "";

    if (!login || !password) {
        errorBlock.textContent = "Введите логин и пароль";
        errorBlock.classList.remove("hidden");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            credentials: "include",
            body: JSON.stringify({ login, password }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            errorBlock.textContent = data.detail || "Ошибка авторизации";
            errorBlock.classList.remove("hidden");
            return;
        }

        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);

        window.location.href = "/chats";
    } catch (err) {
        console.error(err);
        errorBlock.textContent = "Ошибка соединения с сервером";
        errorBlock.classList.remove("hidden");
    }
}

loginButton.addEventListener("click", (e) => {
e.preventDefault();
handleLogin();
});

passwordInput.addEventListener("keydown", (e) => {
if (e.key === "Enter") {
    e.preventDefault();
    handleLogin();
}
});

if (registerLink) {
  registerLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/register";
  });
}
document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "/api/v1"; 

    const loginInput = document.getElementById("login-input");
    const passwordInput = document.getElementById("password-input");
    const loginButton = document.getElementById("login-button");
    const errorBlock = document.getElementById("login-error");
    const registerLink = document.getElementById("register-link");
    const togglePasswordBtn = document.getElementById("toggle-password-btn");

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const icon = togglePasswordBtn.querySelector("span");
            
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                icon.textContent = "visibility_off"; 
            } else {
                passwordInput.type = "password";
                icon.textContent = "visibility";
            }
        });
    }

    async function handleLogin() {
        const login = loginInput.value.trim();
        const password = passwordInput.value;

        errorBlock.classList.add("hidden");
        errorBlock.textContent = "";
        
        loginButton.disabled = true;
        const originalBtnText = loginButton.innerHTML;
        loginButton.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>';

        if (!login || !password) {
            showError("Введите логин и пароль");
            resetButton(originalBtnText);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({ 
                    login: login, 
                    password: password 
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                let msg = data.detail || "Ошибка авторизации";
                if (msg === "Invalid username/password") {
                    msg = "Неверный логин или пароль";
                }
                showError(msg);
                resetButton(originalBtnText);
                return;
            }

            if (data.access_token) {
                localStorage.setItem("access_token", data.access_token);
                window.location.href = "/chats";
            } else {
                showError("Ошибка сервера: токен не получен");
                resetButton(originalBtnText);
            }

        } catch (err) {
            console.error(err);
            showError("Ошибка соединения с сервером");
            resetButton(originalBtnText);
        }
    }

    function showError(msg) {
        errorBlock.textContent = msg;
        errorBlock.classList.remove("hidden");
    }

    function resetButton(originalHtml) {
        loginButton.disabled = false;
        loginButton.innerHTML = originalHtml;
    }

    if (loginButton) {
        loginButton.addEventListener("click", (e) => {
            e.preventDefault();
            handleLogin();
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleLogin();
            }
        });
    }

    if (registerLink) {
        registerLink.addEventListener("click", (e) => {
            window.location.href = "/register";
        });
    }
});

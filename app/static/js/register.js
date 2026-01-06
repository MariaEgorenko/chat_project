document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    const nameInput = document.getElementById("name-input");
    const loginInput = document.getElementById("login-input");
    const passwordInput = document.getElementById("password-input");
    const registerBtn = document.getElementById("register-button");
    const errorEl = document.getElementById("register-error");
    
    const togglePasswordBtn = passwordInput.parentElement.querySelector("button");

    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener("click", () => {
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

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            errorEl.textContent = "";
            errorEl.classList.add("hidden");
            registerBtn.disabled = true;
            registerBtn.classList.add("opacity-70", "cursor-not-allowed");

            const login = loginInput.value.trim();
            const name = nameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!login || !name || !password) {
                showError("Пожалуйста, заполните все поля");
                resetBtn();
                return;
            }

            try {
                const regRes = await fetch("/api/v1/users/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ login, name, password })
                });

                const regData = await regRes.json();

                if (!regRes.ok) {
                    if (regData.detail === "Login already registered") {
                        throw new Error("Пользователь с таким логином уже существует");
                    }
                    throw new Error(regData.detail || "Ошибка регистрации");
                }

                const loginRes = await fetch("/api/v1/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ login: login, password: password })
                });

                const loginData = await loginRes.json();

                if (!loginRes.ok) {
                    console.error("Login Error Details:", loginData);
                    const errorDetail = typeof loginData.detail === 'object' 
                        ? JSON.stringify(loginData.detail) 
                        : (loginData.detail || "Неверный формат ответа");
                    
                    throw new Error(`Ошибка входа: ${errorDetail}`);
                }
                
                localStorage.setItem("access_token", loginData.access_token);
                window.location.href = "/chats";

            } catch (err) {
                console.error(err);
                showError(err.message);
                resetBtn();
            }
        });
    }

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.classList.remove("hidden");
    }

    function resetBtn() {
        registerBtn.disabled = false;
        registerBtn.classList.remove("opacity-70", "cursor-not-allowed");
    }
});

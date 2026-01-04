const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const registerMsg = document.getElementById("register-message");
const loginMsg = document.getElementById("login-message");

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
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
            registerMsg.textContent = "Регистрация успешна, теперь войдите.";
            registerForm.reset();
        } else {
            const data = await res.json().catch(() => ({}));
            registerMsg.textContent = data.detail || "Ошибка регистрации";
        }
    } catch (err) {
        registerMsg.textContent = "Ошибка сети";
    }
});

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
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

        if (res.ok) {
            window.location.href = "/home";
        } else {
            const data = await res.json().catch(() => ({}));
            loginMsg.textContent = data.detail || "Ошибка входа";
        }
    } catch (err) {
        loginMsg.textContent = "Ошибка сети";
    }
});

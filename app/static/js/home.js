const logoutBtn = document.getElementById("logout-btn");

logoutBtn.addEventListener("click", async () => {
    try {
        const res = await fetch("/api/v1/auth/logout", {
            method: "POST",
        });
        if (res.ok) {
            window.location.href = "/";
        } else {
            alert("Ошибка выхода");
        }
    } catch (err) {
        alert("Ошибка сети");
    }
});

let ws = new WebSocket("ws://127.0.0.1:8000/ws/contacts/notifications");

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "contact_request") {
        console.log("Новое приглашение в контакты:", data);
    }
};

ws.onclose = () => {
    console.log("WS closed");
};
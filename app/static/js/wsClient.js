const listeners = new Map(); 
let ws = null;

export function ensureWebSocket(urlWithToken) {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }

    ws = new WebSocket(urlWithToken);

    ws.onopen = () => {
        
    };

    ws.onmessage = (event) => {
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch {
            console.error("Invalid WS message", event.data);
            return;
        }

        const { type } = msg;
        if (!type) return;

        const set = listeners.get(type);
        if (!set) return;

        for (const fn of set) {
            fn(msg)
        }
    };

    ws.onclose = () => { ws =null; };
    ws.onerror = () => { console.error("WS error", err); };
}

export function sendWS(data) {
    if (!ws) return;

    const payload = JSON.stringify(data);

    if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
    } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener("open", () => {
        ws.send(payload);
        }, { once: true });
    }
}

export function subscribe(type, handler) {
    if (!listeners.has(type)) {
        listeners.set(type, new Set());
    }

    listeners.get(type).add(handler);

    return () => {
        listeners.get(type)?.delete(handler);
    };
}
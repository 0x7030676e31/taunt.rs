window.API_URL =
    (import.meta.env.DEV ? "http://localhost:8080" : window.location.origin) +
    "/api";

const WEBSOCKET_URL = import.meta.env.DEV
    ? "ws://localhost:8080"
    : window.location.origin.replace("http", "ws");
window.WEBSOCKET_URL = WEBSOCKET_URL + "/api/socket/ws";
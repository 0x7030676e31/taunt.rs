window.API_URL =
    (import.meta.env.DEV ? "http://localhost:8080" : window.location.origin) +
    "/api";

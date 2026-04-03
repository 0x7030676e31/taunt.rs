import { createContext, type JSX, type Accessor, type Setter, createSignal, useContext, batch, onMount } from "solid-js";
import { addNotification } from "@/notifications";
import { useI18n } from "@/locales/i18n";
import req from "@/req";
import { useLocation } from "@solidjs/router";
export interface AccountContext {
    currentUser: Accessor<Objects.User | null>;
    setCurrentUser: Setter<Objects.User | null>;
    token: Accessor<string | null>;
    setToken: Setter<string | null>;
    invalidateTokenIn: (ms: number) => void;
    logout: () => void;
}

export const accountContext = createContext<AccountContext>();

interface AccountProviderProps {
    children?: JSX.Element | JSX.Element[];
}

export function AccountContextProvider(props: AccountProviderProps) {
    const [t] = useI18n();
    const [currentUser, setCurrentUser] = createSignal<Objects.User | null>(null);
    const [token, setToken] = createSignal<string | null>(null);
    const location = useLocation();

    function logout() {
        localStorage.removeItem("token");
        batch(() => {
            setCurrentUser(null);
            setToken(null);
        });

        if (location.pathname.startsWith("/dashboard")) {
            window.location.href = "/";
        }
    }

    function invalidateTokenIn(ms: number) {
        setTimeout(() => {
            addNotification({
                variant: "warning",
                message: t("session_expired"),
            });

            logout();
        }, ms);
    }

    onMount(() => {
        const storedToken = localStorage.getItem("token");
        if (!storedToken) return;

        (async () => {
            const request = await req<Api.MeResponse, Api.MeError>(`${window.API_URL}/auth/me`, {
                method: "GET",
                headers: {
                    "Authorization": storedToken,
                },
            });

            if (request.error) {
                console.error("Failed to fetch current user:", request.error);
                localStorage.removeItem("token");
                return;
            }

            const response = request.data.split();
            if (response.error) {
                console.error("API error while fetching current user:", response.error);
                localStorage.removeItem("token");
                return;
            }

            const json = await response.data.json();
            if (json.error) {
                console.error("Failed to parse current user response:", json.error);
                localStorage.removeItem("token");
                return;
            }

            const timeUntilExpiry = json.data.tokenExpiryAtMs - Date.now();
            if (timeUntilExpiry <= 0) {
                console.warn("Stored token has already expired.");
                localStorage.removeItem("token");
                return;
            }

            setCurrentUser(json.data.user);
            setToken(storedToken);
            invalidateTokenIn(timeUntilExpiry);
        })();
    });

    return (
        <accountContext.Provider value={{ currentUser, setCurrentUser, token, setToken, logout, invalidateTokenIn }}>
            {props.children}
        </accountContext.Provider>
    );
}

export function useAccountContext() {
    const context = useContext(accountContext);
    if (!context) {
        throw new Error("useAccountContext must be used within an AccountContextProvider");
    }

    return context;
}
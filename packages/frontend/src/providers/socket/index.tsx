import { createContext, type JSX, type Accessor, useContext, createSignal } from "solid-js";

// type SocketState = "connected" | "disconnected" |  | "connecting" | "error";

type SocketState =
    | "disconnected"
    | "connecting"
    | "connected"
    | "ready"
    | "error";

export interface SocketContext {
    socketState: Accessor<SocketState>;
    socketError: Accessor<string | null>;
    sessionId: Accessor<number | null>;
}

export const socketContext = createContext<SocketContext>();

interface SocketProviderProps {
    children?: JSX.Element | JSX.Element[];
}

export function SocketProviderContext(props: SocketProviderProps) {
    const [socketState, setSocketState] = createSignal<SocketState>("disconnected");
    const [socketError, setSocketError] = createSignal<string | null>(null);
    const [sessionId, setSessionId] = createSignal<number | null>(null);

    return (
        <socketContext.Provider value={{ socketState, socketError, sessionId }}>
            {props.children}
        </socketContext.Provider>
    );
}

export function useSocketContext() {
    const context = useContext(socketContext);
    if (!context) {
        throw new Error("useSocketContext must be used within a SocketContextProvider");
    }

    return context;
}
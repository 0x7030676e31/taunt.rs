import { createContext, type JSX, type Accessor, type Setter, createSignal, useContext } from "solid-js";

export interface AccountContext {
    currentUser: Accessor<Objects.User | null>;
    setCurrentUser: Setter<Objects.User | null>;
    logout: () => void;
}

export const accountContext = createContext<AccountContext>();

interface AccountProviderProps {
    children?: JSX.Element | JSX.Element[];
}

export function AccountContextProvider(props: AccountProviderProps) {
    const [currentUser, setCurrentUser] = createSignal<Objects.User | null>(null);

    function logout() {
        // todo
    }

    return (
        <accountContext.Provider value={{ currentUser, setCurrentUser, logout }}>
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
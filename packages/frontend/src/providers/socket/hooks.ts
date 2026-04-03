import { createEffect, on, onCleanup } from "solid-js";
import { useSocketContext } from "./index";

type Callback = () => void | (() => void);

export function onSocketReady(callback: Callback) {
    const { socketState } = useSocketContext();
    let onCleanupCallback: ReturnType<typeof callback>;

    createEffect(
        on(socketState, (state) => {
            if (state === "ready") {
                onCleanupCallback = callback();
            }
        })
    );

    onCleanup(() => {
        if (onCleanupCallback && typeof onCleanupCallback === "function") {
            onCleanupCallback();
        }
    });
}
import { For, Show, batch, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { Portal } from "solid-js/web";

import styles from "./notifications.module.scss";
import { VsClose } from "solid-icons/vs";

interface NotificationItem {
    variant: "info" | "warning" | "error";
    message: string;
    subMessage?: string;
    id: number;
    timeout: number | null;
    fadeOut: boolean;
    timeoutId?: number;
}

const MAX_NOTIFICATIONS = 4;
const NOTIFICATION_DURATION = 6000;
const FADE_OUT_DURATION = 300;

const [queue, setQueue] = createSignal<NotificationItem[]>([]);
const [current, setCurrent] = createStore<NotificationItem[]>([]);

export default function Notifications() {
    return (
        <Portal>
            <div class={styles.notifications}>
                <For each={current}>{(item) => (
                    <Notification {...item} timeout={item.timeout} />
                )}</For>
            </div>
        </Portal>
    );
}

function Notification(props: Omit<NotificationItem, "timeout"> & { timeout: number | null }) {
    const handleMouseEnter = () => {
        if (props.fadeOut || props.timeout === null) return;

        const index = current.findIndex(item => item.id === props.id);
        if (index !== -1 && current[index].timeoutId) {
            clearTimeout(current[index].timeoutId);
            setCurrent(index, "timeoutId", undefined);
        }
    };

    const handleMouseLeave = () => {
        if (props.fadeOut || props.timeout === null) return;

        const index = current.findIndex(item => item.id === props.id);
        if (index !== -1) {
            const timeoutId = setTimeout(() => closeNotification(props.id), props.timeout) as any;
            setCurrent(index, "timeoutId", timeoutId);
        }
    };

    return (
        <div
            class={styles.notification}
            classList={{ [styles.fadeOut]: props.fadeOut }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div class={styles.variant} classList={{ [styles[props.variant]]: true }} />
            <div class={styles.content}>
                <div class={styles.message}>{props.message}</div>
                <Show when={props.subMessage}>
                    <div class={styles.subMessage}>{props.subMessage}</div>
                </Show>
            </div>
            <button class={styles.close} onClick={() => closeNotification(props.id)}>
                <VsClose />
            </button>
        </div>
    );
}

let nextId = 0;

type AddNotificationProps = Omit<NotificationItem, "id" | "timeout" | "fadeOut" | "timeoutId"> & { timeout?: number | null };
export function addNotification(notification: AddNotificationProps): number {
    const timeout = notification.timeout === null ? null : notification.timeout ?? NOTIFICATION_DURATION;
    const id = nextId++;

    let timeoutId: any = undefined;
    if (timeout !== null) {
        timeoutId = setTimeout(() => closeNotification(id), timeout) as any;
    }

    const newNotification: NotificationItem = { ...notification, id, timeout, fadeOut: false, timeoutId };

    if (current.length >= MAX_NOTIFICATIONS) {
        setQueue([...queue(), newNotification]);
        return id;
    }

    setCurrent([...current, newNotification]);
    return id;
}

export function closeNotification(id: number) {
    batch(() => {
        setQueue(queue().filter(item => item.id !== id));
        const index = current.findIndex(item => item.id === id);
        if (index === -1) return;

        if (current[index].timeoutId) {
            clearTimeout(current[index].timeoutId);
        }

        setCurrent(index, "fadeOut", true);
        setTimeout(() => deleteNotification(id), FADE_OUT_DURATION);
    });
}

function deleteNotification(id: number) {
    setCurrent(current.filter(item => item.id !== id));
    processQueue();
}

function processQueue() {
    const itemsToAdd = Math.min(MAX_NOTIFICATIONS - current.length, queue().length);
    if (itemsToAdd === 0) return;

    let newCurrent = [...current];
    for (let i = 0; i < itemsToAdd; i++) {
        const next = queue()[i];
        const newItem = { ...next };
        newCurrent.push(newItem);
        if (next.timeout !== null) {
            const timeoutId = setTimeout(() => closeNotification(next.id), next.timeout) as any;
            newItem.timeoutId = timeoutId;
        }
    }
    setCurrent(newCurrent);
    setQueue(queue().slice(itemsToAdd));
}
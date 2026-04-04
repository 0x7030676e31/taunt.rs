import { Show } from "solid-js";
import type { JSX } from "solid-js";
import { Portal } from "solid-js/web";

import styles from "./modal.module.scss";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: JSX.Element;
}

export default function Modal(props: ModalProps) {
    return (
        <Show when={props.isOpen}>
            <Portal>
                <div class={styles.modalOverlay} onClick={props.onClose}>
                    <div class={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <Show when={props.title}>
                            <h2 class={styles.modalTitle}>{props.title}</h2>
                        </Show>
                        <button class={styles.closeBtn} onClick={props.onClose}>×</button>
                        <div class={styles.modalBody}>
                            {props.children}
                        </div>
                    </div>
                </div>
            </Portal>
        </Show>
    );
}

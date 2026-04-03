import type { Accessor } from "solid-js";

import styles from "./burger.module.scss";

interface BurgerProps {
    onClick: (event: MouseEvent) => void;
    isOpen: Accessor<boolean>;
}

export default function Burger(props: BurgerProps) {
    return (
        <button
            type="button"
            class={styles.burgerContainer}
            classList={{ [styles.open]: props.isOpen() }}
            onClick={props.onClick}
            aria-label="Toggle navigation menu"
            aria-expanded={props.isOpen()}
        >
            <div class={styles.burger}>
                <span class={styles.line} />
                <span class={styles.line} />
                <span class={styles.line} />
            </div>
        </button>
    );
}

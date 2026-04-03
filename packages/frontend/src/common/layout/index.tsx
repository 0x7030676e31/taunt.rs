import type { JSX } from "solid-js";
import styles from "./layout.module.scss";

interface LayoutProps {
    children?: JSX.Element | JSX.Element[];
}

export default function Layout(props: LayoutProps) {
    return (
        <div class={styles.layout}>
            {props.children}
        </div>
    );
}
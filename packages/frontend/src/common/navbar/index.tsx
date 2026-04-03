import styles from "./navbar.module.scss";

export default function Navbar() {
    return (
        <div class={styles.navbar}>

        </div>
    );
}

interface NavbarItemProps {
    icon: string;
    label: string;
}

function NavbarItem(props: NavbarItemProps) {
    return (
        <div class={styles.navbarItem}>
            <span class={styles.navbarItemIcon}>{props.icon}</span>
            <span class={styles.navbarItemLabel}>{props.label}</span>
        </div>
    );
}

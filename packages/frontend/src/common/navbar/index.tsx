import styles from "./navbar.module.scss";
import { useI18n } from "@/locales/i18n";

export default function Navbar() {
    const [t] = useI18n();

    return (
        <div class={styles.navbar}>
            <NavbarItem label={t("navbar.home")} />
            <NavbarItem label={t("navbar.animals")} />
            <NavbarItem label={t("navbar.donate")} />
        </div>
    );
}

interface NavbarItemProps {
    label: string;
}

function NavbarItem(props: NavbarItemProps) {
    return (
        <div class={styles.navbarItem}>
            <span class={styles.navbarItemLabel}>{props.label}</span>
        </div>
    );
}

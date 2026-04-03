import { useAccountContext } from "@/providers/account";
import { A, redirect } from "@solidjs/router"
import { useI18n } from "@/locales/i18n";
import { Show } from "solid-js";
import { RiUserFacesAccountCircleLine } from "solid-icons/ri";
import styles from "./navbar.module.scss";
import type { JSX } from "solid-js";
interface AccountProviderProps {
    children?: JSX.Element | JSX.Element[];
}

export default function Navbar(props: AccountProviderProps) {
    const { currentUser } = useAccountContext();
    const [t] = useI18n();

    return (
        <div class={styles.app}>
            <div class={styles.navbar}>
                <NavbarItem label={t("navbar.home")} href="/" />
                <NavbarItem label={t("navbar.adopt")} href="/adopt" />
                <NavbarItem label={t("navbar.donate")} href="/donate" />
                <div class={styles.separator} />
                <Show when={currentUser()} fallback={<LoginButton />}>
                    <Account />
                </Show>
            </div>
            <div class={styles.content}>
                {props.children}
            </div>
        </div>
    );
}

interface NavbarItemProps {
    label: string;
    href: string;
}

function NavbarItem(props: NavbarItemProps) {
    return (
        <A class={styles.navbarItem} href={props.href}>
            {props.label}
        </A>
    );
}

function LoginButton() {
    const [t] = useI18n();

    return (
        <button onClick={() => redirect("/login")} class={styles.loginButton}>
            <RiUserFacesAccountCircleLine />
            {t("login")}
        </button>
    );
}

function Account() {
    const { currentUser } = useAccountContext();

    return (
        <div class={styles.account}>
            <span>{currentUser()?.email}</span>
        </div>
    );
}
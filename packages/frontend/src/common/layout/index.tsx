import { type JSX, Show } from "solid-js";
import { A } from "@solidjs/router";
import { useI18n } from "@/locales/i18n";
import { useAccountContext } from "@/account";
import { RiUserFacesAccountCircleLine } from "solid-icons/ri";
import logo from "@/assets/logo.png";
import styles from "./layout.module.scss";

interface LayoutProps {
    children?: JSX.Element;
}

export default function Layout(props: LayoutProps) {
    const [t] = useI18n();
    const { currentUser, logout } = useAccountContext();

    return (
        <div class={styles.layout}>
            <header class={styles.topbar}>
                <div class={styles.logoArea}>
                    <A href="/">
                        <img src={logo} alt="Tauntrs Logo" class={styles.logoImage} />
                    </A>
                </div>

                <nav class={styles.navLinks}>
                    <A href="/" end activeClass={styles.activeLink}>{t("navbar.home")}</A>
                    <A href="/dashboard" end activeClass={styles.activeLink}>{t("navbar.dashboard")}</A>
                </nav>

                <div class={styles.userBadge}>
                    <Show when={currentUser()}>
                        <div class={styles.userInfo}>
                            <RiUserFacesAccountCircleLine size={24} />
                            <span class={styles.userName}>{currentUser()?.email}</span>
                        </div>
                        <button onClick={logout}>{t("logout")}</button>
                    </Show>
                    <Show when={!currentUser()}>
                        <A href="/login">{t("login")}</A>
                    </Show>
                </div>
            </header>

            <main class={styles.content}>
                {props.children}
            </main>
        </div>
    );
}

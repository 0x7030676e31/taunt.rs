import { useAccountContext } from "@/providers/account";
import { A, useNavigate } from "@solidjs/router"
import { useI18n } from "@/locales/i18n";
import { Show, createSignal } from "solid-js";
import { RiUserFacesAccountCircleLine } from "solid-icons/ri";
import type { JSX } from "solid-js";

import styles from "./navbar.module.scss";
import logo from "@/assets/logo.png";

interface AccountProviderProps {
    children?: JSX.Element | JSX.Element[];
}

export default function Navbar(props: AccountProviderProps) {
    const { currentUser } = useAccountContext();
    const [t] = useI18n();

    return (
        <div class={styles.app}>
            <div class={styles.navbar}>
                <A href="/" class={styles.logoLink}>
                    <img src={logo} alt="Taunt.rs logo" class={styles.logo} />
                </A>
                <div class={styles.navLinks}>
                    <LanguageDropdown />
                    <div class={styles.separator} />
                    <NavbarItem label={t("navbar.home")} href="/" />
                    <NavbarItem label={t("navbar.adopt")} href="/adopt" />
                    <NavbarItem label={t("navbar.donate")} href="/donate" />
                    <div class={styles.separator} />
                    <Show when={currentUser()} fallback={<LoginButton />}>
                        <Account />
                    </Show>
                </div>
            </div>
            <div class={styles.content}>
                {props.children}
            </div>
        </div>
    );
}

function LanguageDropdown() {
    const [_, locale, setLocale] = useI18n();
    const [open, setOpen] = createSignal(false);

    const currentLabel = () => (locale() === "ua" ? "Українська" : "English");
    const currentFlag = () => (locale() === "ua" ? "fi fi-ua" : "fi fi-gb");

    return (
        <div
            class={styles.languageDropdown}
            tabindex="0"
            onBlur={event => {
                if (!(event.currentTarget as HTMLDivElement).contains(event.relatedTarget as Node | null)) {
                    setOpen(false);
                }
            }}
        >
            <button
                type="button"
                class={styles.languageTrigger}
                onClick={() => setOpen(prev => !prev)}
                aria-haspopup="listbox"
                aria-expanded={open()}
            >
                <span class={`${styles.flag} ${currentFlag()}`} />
                <span class={styles.languageLabel}>{currentLabel()}</span>
                <span class={`${styles.chevron} ${open() ? styles.chevronOpen : ""}`}>▾</span>
            </button>
            <Show when={open()}>
                <div class={styles.languageMenu} role="listbox" aria-label="Select language">
                    <button
                        type="button"
                        class={`${styles.languageOption} ${locale() === "en" ? styles.languageOptionActive : ""}`}
                        onClick={() => {
                            setLocale("en");
                            setOpen(false);
                        }}
                    >
                        <span class={`${styles.flag} fi fi-gb`} />
                        English
                    </button>
                    <button
                        type="button"
                        class={`${styles.languageOption} ${locale() === "ua" ? styles.languageOptionActive : ""}`}
                        onClick={() => {
                            setLocale("ua");
                            setOpen(false);
                        }}
                    >
                        <span class={`${styles.flag} fi fi-ua`} />
                        Українська
                    </button>
                </div>
            </Show>
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
    const redirect = useNavigate();

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
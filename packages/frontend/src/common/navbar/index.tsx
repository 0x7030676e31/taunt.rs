import { useAccountContext } from "@/providers/account";
import { A } from "@solidjs/router"
import { useI18n } from "@/locales/i18n";
import { Show, createSignal } from "solid-js";
import { RiUserFacesAccountCircleLine } from "solid-icons/ri";
import { AiFillCaretDown } from "solid-icons/ai";
import type { JSX } from "solid-js";

import styles from "./navbar.module.scss";
import logo from "@/assets/logo.png";
import { Portal } from "solid-js/web";
import TextInput from "@/common/inputs/text-input";
import PasswordInput from "@/common/inputs/password-input";
import Burger from "@/common/burger";

interface AccountProviderProps {
    children?: JSX.Element | JSX.Element[];
}

export default function Navbar(props: AccountProviderProps) {
    const { currentUser } = useAccountContext();
    const [formMounted, setFormMounted] = createSignal(false);
    const [formVisible, setFormVisible] = createSignal(false);
    const [mobileMenuMounted, setMobileMenuMounted] = createSignal(false);
    const [mobileMenuVisible, setMobileMenuVisible] = createSignal(false);
    const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
    const [t] = useI18n();

    const openForm = () => {
        if (formMounted()) {
            setFormVisible(true);
            return;
        }

        setFormMounted(true);
        requestAnimationFrame(() => setFormVisible(true));
    };

    const closeForm = () => {
        setFormVisible(false);
        window.setTimeout(() => setFormMounted(false), 220);
    };

    const openMobileMenu = () => {
        if (mobileMenuMounted()) {
            setMobileMenuVisible(true);
            setMobileMenuOpen(true);
            return;
        }

        setMobileMenuMounted(true);
        setMobileMenuOpen(true);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setMobileMenuVisible(true));
        });
    };

    const closeMobileMenu = () => {
        setMobileMenuVisible(false);
        setMobileMenuOpen(false);
        window.setTimeout(() => setMobileMenuMounted(false), 260);
    };

    const toggleMobileMenu = () => {
        if (mobileMenuVisible()) {
            closeMobileMenu();
            return;
        }

        openMobileMenu();
    };

    return (
        <>
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
                        <Show when={currentUser() === null} fallback={<Account />}>
                            <button onClick={openForm} class={styles.loginButton}>
                                <RiUserFacesAccountCircleLine />
                                {t("login")}
                            </button>
                        </Show>
                    </div>
                    <div class={styles.mobileBurger}>
                        <Burger
                            isOpen={mobileMenuOpen}
                            onClick={toggleMobileMenu}
                        />
                    </div>
                </div>
                <Show when={mobileMenuMounted()}>
                    <Portal>
                        <div
                            class={styles.mobileMenuOverlay}
                            classList={{ [styles.mobileMenuOverlayVisible]: mobileMenuVisible() }}
                            onClick={closeMobileMenu}
                        >
                            <div
                                class={styles.mobileMenu}
                                onClick={event => event.stopPropagation()}
                            >
                                <div class={styles.mobileSection}>
                                    <MobileLanguageSwitcher />
                                </div>

                                <A class={styles.mobileMenuItem} href="/" onClick={closeMobileMenu}>
                                    {t("navbar.home")}
                                </A>
                                <A class={styles.mobileMenuItem} href="/adopt" onClick={closeMobileMenu}>
                                    {t("navbar.adopt")}
                                </A>
                                <A class={styles.mobileMenuItem} href="/donate" onClick={closeMobileMenu}>
                                    {t("navbar.donate")}
                                </A>

                                <Show when={currentUser() === null} fallback={<MobileAccount onNavigate={closeMobileMenu} />}>
                                    <button
                                        type="button"
                                        class={styles.mobileLoginButton}
                                        onClick={() => {
                                            closeMobileMenu();
                                            openForm();
                                        }}
                                    >
                                        <RiUserFacesAccountCircleLine />
                                        {t("login")}
                                    </button>
                                </Show>
                            </div>
                        </div>
                    </Portal>
                </Show>
                <div class={styles.content}>
                    {props.children}
                </div>
            </div>
            <Show when={formMounted()}>
                <Portal>
                    <div
                        class={styles.formModalContainer}
                        classList={{ [styles.formModalVisible]: formVisible() }}
                        onClick={closeForm}
                    >
                        <LoginForm onClose={closeForm} />
                    </div>
                </Portal>
            </Show>
        </>
    );
}

function MobileLanguageSwitcher() {
    const [_, locale, setLocale] = useI18n();

    return (
        <div class={styles.mobileLanguageRow}>
            <button
                type="button"
                class={`${styles.mobileLanguageButton} ${locale() === "en" ? styles.mobileLanguageButtonActive : ""}`}
                onClick={() => setLocale("en")}
            >
                <span class={`${styles.flag} fi fi-gb`} />
                English
            </button>
            <button
                type="button"
                class={`${styles.mobileLanguageButton} ${locale() === "ua" ? styles.mobileLanguageButtonActive : ""}`}
                onClick={() => setLocale("ua")}
            >
                <span class={`${styles.flag} fi fi-ua`} />
                Українська
            </button>
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
                <AiFillCaretDown class={`${styles.chevron} ${open() ? styles.chevronOpen : ""}`} />
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
    href?: string;
    onClick?: () => void;
}

function NavbarItem(props: NavbarItemProps) {
    const isHref = () => props.href !== undefined;

    return (
        // <A class={styles.navbarItem} href={props.href}>
        //     {props.label}
        // </A>
        <Show when={isHref()} fallback={
            <button class={styles.navbarItem} onClick={props.onClick}>
                {props.label}
            </button>
        }>
            <A class={styles.navbarItem} href={props.href!}>
                {props.label}
            </A>
        </Show>
    );
}

function Account() {
    const { currentUser } = useAccountContext();
    const [t] = useI18n();

    return (
        <div class={styles.accountMenu}>
            <div class={styles.accountInfo}>
                <RiUserFacesAccountCircleLine class={styles.accountIcon} />
                <span class={styles.accountName}>{currentUser()?.email}</span>
            </div>
            <div class={styles.accountActions}>
                <A href="/dashboard" class={styles.accountAction}>
                    {t("navbar.dashboard")}
                </A>
                <button class={styles.accountAction}>
                    {t("logout")}
                </button>
            </div>
        </div>
    );
}

interface MobileAccountProps {
    onNavigate: () => void;
}

function MobileAccount(props: MobileAccountProps) {
    const [t] = useI18n();

    return (
        <div class={styles.mobileAccountBlock}>
            <A href="/dashboard" class={styles.mobileMenuItem} onClick={props.onNavigate}>
                {t("navbar.dashboard")}
            </A>
            <button type="button" class={styles.mobileMenuItem}>
                {t("logout")}
            </button>
        </div>
    );
}

type AuthMode = "login" | "register";

interface LoginFormProps {
    onClose: () => void;
}

function LoginForm(props: LoginFormProps) {
    const [t] = useI18n();
    const [mode, setMode] = createSignal<AuthMode>("login");
    const [email, setEmail] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [confirmPassword, setConfirmPassword] = createSignal("");
    const [submitMessage, setSubmitMessage] = createSignal("");

    const emailValidationMessage = (value: string) => {
        const normalized = value.trim();

        if (normalized.length === 0) {
            return t("auth.error.emailRequired");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
            return t("auth.error.emailInvalid");
        }

        return "";
    };

    const passwordValidationMessage = (value: string) => {
        if (value.length < 8) {
            return `${t("auth.error.passwordLength")} (${value.length}/8)`;
        }

        if (!/[a-z]/.test(value)) {
            return t("auth.error.passwordLowercase");
        }

        if (!/[A-Z]/.test(value)) {
            return t("auth.error.passwordUppercase");
        }

        if (!/[0-9]/.test(value)) {
            return t("auth.error.passwordNumber");
        }

        if (!/[!@#$%^&*(),.?":{}|<>\-_[\]\\/`~+=]/.test(value)) {
            return t("auth.error.passwordSpecial");
        }

        return "";
    };

    const switchMode = (nextMode: AuthMode) => {
        setMode(nextMode);
        setSubmitMessage("");
    };

    const emailError = () => emailValidationMessage(email());

    const passwordError = () => passwordValidationMessage(password());

    const confirmError = () => {
        if (mode() !== "register") {
            return "";
        }

        if (confirmPassword().trim().length === 0) {
            return t("auth.error.confirmRequired");
        }

        if (confirmPassword() !== password()) {
            return t("auth.error.passwordMatch");
        }

        return "";
    };

    const onSubmit: JSX.EventHandlerUnion<HTMLFormElement, SubmitEvent> = event => {
        event.preventDefault();

        const hasEmailError = emailValidationMessage(email()) !== "";
        const hasPasswordError = passwordValidationMessage(password()) !== "";
        const hasConfirmError = mode() === "register" && confirmPassword() !== password();

        if (hasEmailError || hasPasswordError || hasConfirmError) {
            return;
        }

        // Placeholder submit handler until API integration is added.
        setSubmitMessage(t("auth.placeholder.submit"));
    };

    return (
        <div class={styles.formModal} onClick={event => event.stopPropagation()}>
            <div class={styles.formHeader}>
                <div class={styles.formTitleBlock}>
                    <h2 class={styles.formTitle}>{t("auth.volunteerTitle")}</h2>
                    <p class={styles.formSubtitle}>{t("auth.volunteerSubtitle")}</p>
                    <div class={styles.formModeToggle}>
                        <button
                            type="button"
                            class={`${styles.formModeButton} ${mode() === "login" ? styles.formModeButtonActive : ""}`}
                            onClick={() => switchMode("login")}
                        >
                            {t("auth.login")}
                        </button>
                        <button
                            type="button"
                            class={`${styles.formModeButton} ${mode() === "register" ? styles.formModeButtonActive : ""}`}
                            onClick={() => switchMode("register")}
                        >
                            {t("auth.register")}
                        </button>
                    </div>
                </div>
                <button type="button" class={styles.closeButton} onClick={props.onClose} aria-label={t("auth.close")}>
                    ×
                </button>
            </div>

            <form class={styles.authForm} onSubmit={onSubmit} novalidate>
                <TextInput
                    label={t("auth.email")}
                    type="email"
                    value={email()}
                    onInput={event => {
                        setEmail(event.currentTarget.value);
                        setSubmitMessage("");
                    }}
                    autocomplete="email"
                    error={emailError()}
                />

                <PasswordInput
                    label={t("auth.password")}
                    value={password()}
                    onInput={event => {
                        setPassword(event.currentTarget.value);
                        setSubmitMessage("");
                    }}
                    autocomplete={mode() === "login" ? "current-password" : "new-password"}
                    error={passwordError()}
                />

                <Show when={mode() === "register"}>
                    <PasswordInput
                        label={t("auth.confirmPassword")}
                        value={confirmPassword()}
                        onInput={event => {
                            setConfirmPassword(event.currentTarget.value);
                            setSubmitMessage("");
                        }}
                        autocomplete="new-password"
                        error={confirmError()}
                    />
                </Show>

                <button type="submit" class={styles.submitButton}>
                    {mode() === "login" ? t("auth.login") : t("auth.register")}
                </button>

                <Show when={submitMessage()}>
                    <p class={styles.placeholderText}>{submitMessage()}</p>
                </Show>
            </form>
        </div>
    );
}
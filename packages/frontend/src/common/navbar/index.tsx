import { useAccountContext } from "@/account";
import { A } from "@solidjs/router"
import { useI18n } from "@/locales/i18n";
import { Show, batch, createSignal, onMount } from "solid-js";
import { RiUserFacesAccountCircleLine } from "solid-icons/ri";
import { AiFillCaretDown } from "solid-icons/ai";
import type { JSX } from "solid-js";

import styles from "./navbar.module.scss";
import logo from "@/assets/logo.png";
import { Portal } from "solid-js/web";
import TextInput from "@/common/inputs/text-input";
import PasswordInput from "@/common/inputs/password-input";
import Burger from "@/common/burger";
import { FaSolidClose } from "solid-icons/fa";
import req from "@/req";
import { addNotification } from "@/notifications";

interface AccountProviderProps {
    children?: JSX.Element | JSX.Element[];
}

export default function Navbar(props: AccountProviderProps) {
    const { currentUser } = useAccountContext();
    const [formVisible, setFormVisible] = createSignal(false);
    const [mobileMenuVisible, setMobileMenuVisible] = createSignal(false);
    const [t] = useI18n();

    const openForm = () => setFormVisible(true);
    const closeForm = () => setFormVisible(false);

    const closeMobileMenu = () => setMobileMenuVisible(false);
    const toggleMobileMenu = () => setMobileMenuVisible(prev => !prev);

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
                        <NavbarItem label={t("navbar.donate")} href="/donations" />
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
                            isOpen={mobileMenuVisible}
                            onClick={toggleMobileMenu}
                        />
                    </div>
                </div>
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
                <div class={styles.content}>
                    {props.children}
                </div>
            </div>
            <Portal>
                <div
                    class={styles.formModalContainer}
                    classList={{ [styles.formModalVisible]: formVisible() }}
                    onClick={closeForm}
                >
                    <LoginForm onClose={closeForm} />
                </div>
            </Portal>
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
            <button
                type="button"
                class={`${styles.mobileLanguageButton} ${locale() === "uaLatin" ? styles.mobileLanguageButtonActive : ""}`}
                onClick={() => setLocale("uaLatin")}
            >
                <span class={`${styles.flag} fi fi-ua`} />
                Ukrajińśka
            </button>
        </div>
    );
}

function LanguageDropdown() {
    const [_, locale, setLocale] = useI18n();
    const [open, setOpen] = createSignal(false);

    const currentLabel = () => (locale() === "ua" ? "Українська" : locale() === "en" ? "English" : "Ukrajińśka");
    const currentFlag = () => (locale() === "ua" || locale() === "uaLatin" ? "fi fi-ua" : "fi fi-gb");

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
            <div
                class={styles.languageMenu}
                classList={{ [styles.languageMenuVisible]: open() }}
                role="listbox"
                aria-label="Select language"
            >
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
                <button
                    type="button"
                    class={`${styles.languageOption} ${locale() === "uaLatin" ? styles.languageOptionActive : ""}`}
                    onClick={() => {
                        setLocale("uaLatin");
                        setOpen(false);
                    }}
                >
                    <span class={`${styles.flag} fi fi-ua`} />
                    Ukrajińśka
                </button>
            </div>
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
    const { currentUser, logout } = useAccountContext();
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
                <button class={styles.accountAction} onClick={logout}>
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
    const { logout } = useAccountContext();

    const handleLogout = () => {
        logout();
        props.onNavigate();
    };

    return (
        <div class={styles.mobileAccountBlock}>
            <A href="/dashboard" class={styles.mobileMenuItem} onClick={props.onNavigate}>
                {t("navbar.dashboard")}
            </A>
            <button type="button" class={styles.mobileMenuItem} onClick={handleLogout}>
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
    const { setCurrentUser, setToken, invalidateTokenIn } = useAccountContext();
    const [mode, setMode] = createSignal<AuthMode>("login");
    const [email, setEmail] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [confirmPassword, setConfirmPassword] = createSignal("");
    const [submitMessage, setSubmitMessage] = createSignal("");
    const [isDisabled, setIsDisabled] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

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
        setError(null);
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

    const onSubmit: JSX.EventHandlerUnion<HTMLFormElement, SubmitEvent> = async event => {
        event.preventDefault();

        const hasEmailError = emailValidationMessage(email()) !== "";
        const hasPasswordError = passwordValidationMessage(password()) !== "";
        const hasConfirmError = mode() === "register" && confirmPassword() !== password();

        if (hasEmailError || hasPasswordError || hasConfirmError) {
            return;
        }

        setIsDisabled(true);
        if (mode() === "login") {
            await handleLogin();
        } else {
            await handleRegister();
        }
    };

    async function handleLogin() {
        const newToken = await grecaptcha.execute(
            import.meta.env.VITE_RECAPTCHA_SITE_KEY,
            { action: mode() }
        );

        const request = await req<Api.LoginResponse, Api.LoginError>(`${window.API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: email().trim(),
                password: password().trim(),
                recaptchaToken: newToken,
            }),
        });

        if (request.error) {
            batch(() => {
                setIsDisabled(false);
                const reqErr = request.error;
                if (typeof reqErr === "string") {
                    setError(reqErr);
                } else {
                    setError(t(reqErr.status));
                }
            });
            return;
        }

        const response = request.data.split();
        if (response.error) {
            setIsDisabled(false);
            const json = await response.error.json();

            if (json.error) {
                setError(t(json.error.status));
            } else {
                setError(t(json.data.status));
            }

            return;
        }

        const json = await response.data.json();
        if (json.error) {
            batch(() => {
                setIsDisabled(false);
                setError(t(json.error.status));
            });

            return;
        }

        localStorage.setItem("token", json.data.token);
        batch(() => {
            setCurrentUser(json.data.user);
            setToken(json.data.token);
        });

        addNotification({
            variant: "info",
            message: t("auth.loginSuccess"),
        });

        props.onClose();
        invalidateTokenIn(json.data.tokenExpiryAtMs - Date.now());
    }

    async function handleRegister() {
        const newToken = await grecaptcha.execute(
            import.meta.env.VITE_RECAPTCHA_SITE_KEY,
            { action: mode() }
        );

        const request = await req<Api.RegisterResponse, Api.RegisterError>(`${window.API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: email().trim(),
                password: password().trim(),
                recaptchaToken: newToken,
            }),
        });

        if (request.error) {
            batch(() => {
                setIsDisabled(false);
                const reqErr = request.error;
                if (typeof reqErr === "string") {
                    setError(reqErr);
                } else {
                    setError(t(reqErr.status));
                }
            });
            return;
        }

        const response = request.data.split();
        if (response.error) {
            setIsDisabled(false);
            const json = await response.error.json();

            if (json.error) {
                setError(t(json.error.status));
            } else {
                setError(t(json.data.status));
            }

            return;
        }

        const json = await response.data.json();
        if (json.error) {
            batch(() => {
                setIsDisabled(false);
                setError(t(json.error.status));
            });

            return;
        }

        localStorage.setItem("token", json.data.token);
        batch(() => {
            setCurrentUser(json.data.user);
            setToken(json.data.token);
        });

        addNotification({
            variant: "info",
            message: t("auth.registerSuccess"),
        });

        props.onClose();
        invalidateTokenIn(json.data.tokenExpiryAtMs - Date.now());
    }

    onMount(() => {
        grecaptcha.ready(() => {
            console.log("[Login Form] reCaptcha v3 is ready!");
        });
    });

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
                    <FaSolidClose />
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
                        setError(null);
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
                        setError(null);
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
                            setError(null);
                        }}
                        autocomplete="new-password"
                        error={confirmError()}
                    />
                </Show>

                <Show when={error()}>
                    <p class={styles.submitErrorText}>{error()}</p>
                </Show>

                <button type="submit" class={styles.submitButton} disabled={isDisabled()}>
                    {mode() === "login" ? t("auth.login") : t("auth.register")}
                </button>

                <Show when={submitMessage()}>
                    <p class={styles.placeholderText}>{submitMessage()}</p>
                </Show>

                <p class={styles.recaptchaText}>
                    {t("auth.recaptcha.text1")}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" class={styles.recaptchaLink}>
                        {t("auth.recaptcha.privacy")}
                    </a>
                    {t("auth.recaptcha.text2")}
                    <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" class={styles.recaptchaLink}>
                        {t("auth.recaptcha.terms")}
                    </a>
                    {t("auth.recaptcha.text3")}
                </p>
            </form>
        </div>
    );
}

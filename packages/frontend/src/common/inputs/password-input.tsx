import { Show, createSignal, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { AiOutlineEyeInvisible } from "solid-icons/ai";
import { AiOutlineEye } from "solid-icons/ai";

import styles from "./input.module.scss";

interface PasswordInputProps {
    label: string;
    error?: string;
    class?: string;
    inputClass?: string;
    disabled?: boolean;
}

export default function PasswordInput(
    props: PasswordInputProps & Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "class" | "type">
) {
    const [local, inputProps] = splitProps(props, ["label", "error", "class", "inputClass", "id", "disabled"]);
    const [visible, setVisible] = createSignal(false);
    const generatedId = createUniqueId();
    const inputId = () => local.id ?? generatedId;

    return (
        <label class={`${styles.fieldLabel} ${local.disabled ? styles.fieldDisabled : ""} ${local.class ?? ""}`} for={inputId()}>
            {local.label}
            <div class={styles.inputShell}>
                <input
                    {...inputProps}
                    id={inputId()}
                    disabled={local.disabled}
                    type={visible() ? "text" : "password"}
                    class={`${styles.inputField} ${styles.inputWithAction} ${local.error ? styles.inputInvalid : ""} ${local.inputClass ?? ""}`}
                />
                <button
                    type="button"
                    class={styles.actionButton}
                    disabled={local.disabled}
                    onClick={() => setVisible(prev => !prev)}
                    aria-label={visible() ? "Hide password" : "Show password"}
                >
                    <Show when={visible()} fallback={<AiOutlineEyeInvisible />}>
                        <AiOutlineEye />
                    </Show>
                </button>
            </div>
            <Show when={local.error}>
                <p class={styles.errorText}>{local.error}</p>
            </Show>
        </label>
    );
}

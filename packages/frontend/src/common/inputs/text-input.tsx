import { Show, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";

import styles from "./input.module.scss";

interface TextInputProps {
    label: string;
    error?: string;
    class?: string;
    inputClass?: string;
    disabled?: boolean;
}

export default function TextInput(
    props: TextInputProps & Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "class">
) {
    const [local, inputProps] = splitProps(props, ["label", "error", "class", "inputClass", "id", "disabled"]);
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
                    class={`${styles.inputField} ${local.error ? styles.inputInvalid : ""} ${local.inputClass ?? ""}`}
                />
            </div>
            <Show when={local.error}>
                <p class={styles.errorText}>{local.error}</p>
            </Show>
        </label>
    );
}

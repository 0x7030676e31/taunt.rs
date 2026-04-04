import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import { useI18n } from "@/locales/i18n";
import req from "@/req";
import styles from "./create_pet.module.scss";
import { useAccountContext } from "@/account";
import { addNotification } from "@/notifications";
import { useNavigate } from "@solidjs/router";

export default function CreatePet() {
    const { token } = useAccountContext();
    const [t] = useI18n();

    const sanitizeIntegerInput = (value: string) => value.match(/^\d*/)![0];
    const allowDigitInput = (value: string) => /^\d*$/.test(value);
    const preventNonDigitKey = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        const controlKeys = ["Backspace", "Delete", "Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
        if (controlKeys.includes(e.key)) {
            return;
        }

        if (e.key.length === 1 && !/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const preventNonDigitPaste = (e: ClipboardEvent) => {
        const text = e.clipboardData?.getData("text") ?? "";
        if (!allowDigitInput(text)) {
            e.preventDefault();
        }
    };

    const preventNonDigitBeforeInput = (e: InputEvent) => {
        if (typeof e.data === "string" && e.data.length > 0 && !allowDigitInput(e.data)) {
            e.preventDefault();
        }
    };

    const [name, setName] = createSignal("");
    const [ageYears, setAgeYears] = createSignal("");
    const [ageMonths, setAgeMonths] = createSignal("");
    const [gender, setGender] = createSignal<"male" | "female">("male");
    const [species, setSpecies] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [imageUrl, setImageUrl] = createSignal("");

    const [previewImageUrl, setPreviewImageUrl] = createSignal("");
    const [disabled, setDisabled] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);
    const navigate = useNavigate();

    createEffect(() => {
        const urlToDebounce = imageUrl();

        const timer = setTimeout(() => {
            setPreviewImageUrl(urlToDebounce);
        }, 500);
        onCleanup(() => clearTimeout(timer));
    });

    const errors = () => {
        let errs: { [key: string]: string } = {};

        if (name().length === 0) {
            errs.name = t("create_pet.error.nameRequired");
        }

        let years = parseInt(ageYears() || "0", 10);
        let months = parseInt(ageMonths() || "0", 10);

        if (isNaN(years) || years < 0) {
            errs.ageYears = t("create_pet.error.invalidYears");
        }
        if (isNaN(months) || months < 0 || months > 11) {
            errs.ageMonths = t("create_pet.error.invalidMonths");
        }

        if (species().length === 0) {
            errs.species = t("create_pet.error.speciesRequired");
        }

        if (description().length === 0) {
            errs.description = t("create_pet.error.descriptionRequired");
        }

        return errs;
    };

    const hasErrors = () => Object.keys(errors()).length > 0;

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (hasErrors()) return;

        const totalMonths = (parseInt(ageYears() || "0", 10) * 12) + parseInt(ageMonths() || "0", 10);

        const payload = {
            name: name(),
            ageMonths: totalMonths,
            gender: gender(),
            species: species(),
            description: description(),
            imageUrl: imageUrl()
        };

        setDisabled(true);
        const request = await req<Api.CreatePetResponse, Api.CreatePetError>(`${window.API_URL}/pets`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token()?.toString() || "",
            },
            body: JSON.stringify(payload),
        });

        if (request.error) {
            setError(t(request.error.status));
            setDisabled(false);
            return;
        }

        const response = request.data.split();
        if (response.error) {
            setError(t((await response.error.json()).spread().status));
            setDisabled(false);
            return;
        }

        const json = await response.data.json();
        if (json.error) {
            setError(t(json.error.status));
            setDisabled(false);
            return;
        }

        addNotification({
            variant: "info",
            message: t("create_pet.success"),
            subMessage: t("create_pet.successSub", { name: name() }),
        });

        navigate(`/dashboard/pets/${json.data.petId}`);
    }

    return (
        <div class={styles.pageContainer}>
            <div class={styles.contentWrapper}>
                <form class={styles.formContainer} onSubmit={handleSubmit}>
                    <h2>{t("create_pet.title")}</h2>

                    <Show when={error() !== null}>
                        <div class={styles.errorBanner}>{error()}</div>
                    </Show>

                    <div class={styles.fieldGroup}>
                        <label class={styles.fieldLabel}>{t("create_pet.name")}</label>
                        <input
                            disabled={disabled()}
                            type="text"
                            class={`${styles.inputField} ${name().length > 0 && errors().name ? styles.inputInvalid : ""}`}
                            placeholder={t("create_pet.namePlaceholder")}
                            value={name()}
                            onInput={(e) => { setName(e.currentTarget.value); setError(null); }}
                        />
                        <Show when={name().length > 0 && errors().name}>
                            <span class={styles.errorText}>{errors().name}</span>
                        </Show>
                    </div>

                    <div class={styles.row}>
                        <div class={styles.fieldGroup}>
                            <label class={styles.fieldLabel}>{t("create_pet.ageYears")}</label>
                            <input
                                disabled={disabled()}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                class={`${styles.inputField} ${ageYears().length > 0 && errors().ageYears ? styles.inputInvalid : ""}`}
                                placeholder={t("create_pet.ageYearsPlaceholder")}
                                value={ageYears()}
                                onBeforeInput={(e) => preventNonDigitBeforeInput(e as InputEvent)}
                                onKeyDown={(e) => preventNonDigitKey(e as KeyboardEvent)}
                                onPaste={(e) => preventNonDigitPaste(e as ClipboardEvent)}
                                onDrop={(e) => e.preventDefault()}
                                onInput={(e) => { setAgeYears(sanitizeIntegerInput(e.currentTarget.value)); setError(null); }}
                            />
                            <Show when={ageYears().length > 0 && errors().ageYears}>
                                <span class={styles.errorText}>{errors().ageYears}</span>
                            </Show>
                        </div>

                        <div class={styles.fieldGroup}>
                            <label class={styles.fieldLabel}>{t("create_pet.ageMonths")}</label>
                            <input
                                disabled={disabled()}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                class={`${styles.inputField} ${ageMonths().length > 0 && errors().ageMonths ? styles.inputInvalid : ""}`}
                                placeholder={t("create_pet.ageMonthsPlaceholder")}
                                value={ageMonths()}
                                onBeforeInput={(e) => preventNonDigitBeforeInput(e as InputEvent)}
                                onKeyDown={(e) => preventNonDigitKey(e as KeyboardEvent)}
                                onPaste={(e) => preventNonDigitPaste(e as ClipboardEvent)}
                                onDrop={(e) => e.preventDefault()}
                                onInput={(e) => { setAgeMonths(sanitizeIntegerInput(e.currentTarget.value)); setError(null); }}
                            />
                            <Show when={ageMonths().length > 0 && errors().ageMonths}>
                                <span class={styles.errorText}>{errors().ageMonths}</span>
                            </Show>
                        </div>
                    </div>

                    <div class={styles.row}>
                        <div class={styles.fieldGroup}>
                            <label class={styles.fieldLabel}>{t("create_pet.gender")}</label>
                            <select
                                disabled={disabled()}
                                class={styles.inputField}
                                value={gender()}
                                onChange={(e) => { setGender(e.currentTarget.value as "male" | "female"); setError(null); }}
                            >
                                <option value="male">{t("create_pet.male")}</option>
                                <option value="female">{t("create_pet.female")}</option>
                            </select>
                        </div>

                        <div class={styles.fieldGroup}>
                            <label class={styles.fieldLabel}>{t("create_pet.species")}</label>
                            <input
                                disabled={disabled()}
                                type="text"
                                class={`${styles.inputField} ${species().length > 0 && errors().species ? styles.inputInvalid : ""}`}
                                placeholder={t("create_pet.speciesPlaceholder")}
                                value={species()}
                                onInput={(e) => { setSpecies(e.currentTarget.value); setError(null); }}
                            />
                            <Show when={species().length > 0 && errors().species}>
                                <span class={styles.errorText}>{errors().species}</span>
                            </Show>
                        </div>
                    </div>

                    <div class={styles.fieldGroup}>
                        <label class={styles.fieldLabel}>{t("create_pet.image")}</label>
                        <input
                            disabled={disabled()}
                            type="url"
                            class={styles.inputField}
                            placeholder={t("create_pet.imagePlaceholder")}
                            value={imageUrl()}
                            onInput={(e) => { setImageUrl(e.currentTarget.value); setError(null); }}
                        />
                    </div>

                    <div class={styles.fieldGroup}>
                        <label class={styles.fieldLabel}>{t("create_pet.description")}</label>
                        <textarea
                            disabled={disabled()}
                            class={`${styles.inputField} ${description().length > 0 && errors().description ? styles.inputInvalid : ""}`}
                            placeholder={t("create_pet.descriptionPlaceholder")}
                            rows={4}
                            value={description()}
                            onInput={(e) => { setDescription(e.currentTarget.value); setError(null); }}
                        />
                        <Show when={description().length > 0 && errors().description}>
                            <span class={styles.errorText}>{errors().description}</span>
                        </Show>
                    </div>

                    <button
                        type="submit"
                        class={styles.submitBtn}
                        disabled={disabled() || error() !== null || hasErrors() || name().length === 0 || species().length === 0 || description().length === 0}
                    >
                        {t("create_pet.submit")}
                    </button>
                </form>

                <div class={styles.previewContainer}>
                    <h3>{t("create_pet.preview")}</h3>
                    <div class={styles.card}>
                        <Show
                            when={previewImageUrl()}
                            fallback={<div class={styles.cardImage}>{t("create_pet.noImage")}</div>}
                        >
                            <img
                                src={previewImageUrl()}
                                alt="Pet preview image"
                                class={styles.cardImage}
                                onLoad={(e) => {
                                    e.currentTarget.style.display = "";
                                    e.currentTarget.nextElementSibling?.setAttribute("style", "display: none;");
                                }}
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.nextElementSibling?.removeAttribute("style");
                                }}
                            />
                            <div class={styles.cardImage} style="display: none;">{t("create_pet.invalidImage")}</div>
                        </Show>

                        <div class={styles.cardContent}>
                            <h4 class={styles.cardTitle}>{name() || t("create_pet.defaultName")}</h4>
                            <p class={styles.cardSubtitle}>
                                {ageYears() || "0"}y {ageMonths() || "0"}m • {gender() === "male" ? t("create_pet.male") : t("create_pet.female")} • {species() || t("create_pet.defaultSpecies")}
                            </p>
                            <p class={styles.cardDescription}>
                                {description() || t("create_pet.defaultDescription")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

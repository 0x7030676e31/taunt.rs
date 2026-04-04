import styles from "./adopt.module.scss";

import req from "@/req";
import { batch, createSignal, onMount, Show, For } from "solid-js";
import { useI18n } from "@/locales/i18n";
import { A } from "@solidjs/router";
import { FaSolidSpinner } from "solid-icons/fa";

export default function Adopt() {
    const [t] = useI18n();
    const [loading, setLoading] = createSignal(true);
    const [pets, setPets] = createSignal<Objects.Pet[]>([]);
    const [error, setError] = createSignal<string | null>(null);
    const [searchQuery, setSearchQuery] = createSignal("");

    const sortedSearchedPets = () => {
        const query = searchQuery().trim().toLowerCase();

        const filtered = pets().filter((pet) => {
            const haystack = `${pet.name} ${pet.species}`.toLowerCase();
            const matchesSearch = query.length === 0 || haystack.includes(query);
            return matchesSearch;
        });

        return filtered.slice().sort((a, b) => {
            const statusPriority = (status: Objects.Pet["status"]) => {
                if (status === "available") return 0;
                if (status === "pending") return 1;
                return 2;
            };

            const statusDiff = statusPriority(a.status) - statusPriority(b.status);
            if (statusDiff !== 0) return statusDiff;

            return a.name.localeCompare(b.name);
        });
    };

    onMount(async () => {
        const request = await req<Api.GetPetsResponse, Api.GetPetsError>(`${window.API_URL}/pets`, {
            method: "GET",
        });

        if (request.error) {
            batch(() => {
                setError(request.error.message);
                setLoading(false);
            });
            return;
        }

        const response = request.data.split();
        if (response.error) {
            setError(t((await response.error.json()).spread().status));
            setLoading(false);
            return;
        }

        const json = await response.data.json();
        if (json.error) {
            batch(() => {
                setError(json.error.message);
                setLoading(false);
            });
            return;
        }

        batch(() => {
            setPets(json.data);
            setLoading(false);
        });
    });

    return (
        <div class={styles.pageContainer}>
            <div class={styles.contentWrapper}>
                <div class={styles.header}>
                    <h1>{t("navbar.adopt")}</h1>

                    <div class={styles.controls}>
                        <input
                            type="text"
                            class={styles.searchInput}
                            placeholder={t("pets.searchPlaceholder")}
                            value={searchQuery()}
                            onInput={(e) => setSearchQuery(e.currentTarget.value)}
                        />
                    </div>
                </div>

                <Show when={loading()}>
                    <div class={styles.loadingSpinner}>
                        <FaSolidSpinner class="fa-spin" />
                    </div>
                </Show>

                <Show when={error() && !loading()}>
                    <div class={styles.errorBanner}>{error()}</div>
                </Show>

                <Show when={!loading() && !error()}>
                    <div class={styles.petsGrid}>
                        <Show
                            when={sortedSearchedPets().length > 0}
                            fallback={<div class={styles.noResults}>{t("pets.noPets")}</div>}
                        >
                            <For each={sortedSearchedPets()}>
                                {(pet) => (
                                    <A
                                        href={`/adopt/${pet.petId}`}
                                        class={styles.petCard}
                                        classList={{ [styles.fadedCard]: pet.status !== "available" }}
                                    >
                                        <div class={styles.cardImageWrapper}>
                                            <Show
                                                when={pet.imageUrl}
                                                fallback={<div class={styles.noImage}>{t("create_pet.noImage")}</div>}
                                            >
                                                <img
                                                    src={pet.imageUrl}
                                                    alt={pet.name}
                                                    class={styles.cardImage}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = "none";
                                                        e.currentTarget.nextElementSibling?.removeAttribute("style");
                                                    }}
                                                />
                                                <div class={styles.noImage} style="display: none;">{t("create_pet.invalidImage")}</div>
                                            </Show>
                                            <div class={`${styles.statusBadge} ${styles[pet.status]}`}>
                                                {t(`pets.status.${pet.status}`)}
                                            </div>
                                        </div>
                                        <div class={styles.cardContent}>
                                            <h3 class={styles.cardTitle}>{pet.name}</h3>
                                            <p class={styles.cardSubtitle}>
                                                {Math.floor(pet.ageMonths / 12)}y {pet.ageMonths % 12}m • {pet.gender === "male" ? t("create_pet.male") : t("create_pet.female")} • {pet.species}
                                            </p>
                                            <p class={styles.cardDescription}>{pet.description}</p>
                                        </div>
                                    </A>
                                )}
                            </For>
                        </Show>
                    </div>
                </Show>
            </div>
        </div>
    );
}
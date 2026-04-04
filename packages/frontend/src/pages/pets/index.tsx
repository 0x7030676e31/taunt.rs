import styles from "./pets.module.scss";
import req from "@/req";
import { batch, createSignal, onMount, Show, For } from "solid-js";
import { useI18n } from "@/locales/i18n";
import { A } from "@solidjs/router";
import { FaSolidSpinner } from "solid-icons/fa";

export default function Pets() {
    const [t] = useI18n();
    const [loading, setLoading] = createSignal(true);
    const [pets, setPets] = createSignal<Objects.Pet[]>([]);
    const [error, setError] = createSignal<string | null>(null);
    const [searchQuery, setSearchQuery] = createSignal("");
    const [categoryFilter, setCategoryFilter] = createSignal<string | null>(null);

    const filteredPets = () => {
        return pets().filter(pet => {
            const matchesSearch = pet.name.toLowerCase().includes(searchQuery().toLowerCase());
            const matchesCategory = categoryFilter() ? pet.status === categoryFilter() : true;
            return matchesSearch && matchesCategory;
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
                    <h1>{t("pets.title")}</h1>

                    <div class={styles.controls}>
                        <div class={styles.statusFilters}>
                            <button
                                class={`${styles.filterBadge} ${categoryFilter() === null ? styles.activeFilter : ""}`}
                                onClick={() => setCategoryFilter(null)}
                            >
                                {t("pets.filterAll")}
                            </button>
                            <button
                                class={`${styles.filterBadge} ${categoryFilter() === "available" ? styles.activeFilter : ""}`}
                                onClick={() => setCategoryFilter("available")}
                            >
                                {t("pets.filterAvailable")}
                            </button>
                            <button
                                class={`${styles.filterBadge} ${categoryFilter() === "pending" ? styles.activeFilter : ""}`}
                                onClick={() => setCategoryFilter("pending")}
                            >
                                {t("pets.filterPending")}
                            </button>
                            <button
                                class={`${styles.filterBadge} ${categoryFilter() === "adopted" ? styles.activeFilter : ""}`}
                                onClick={() => setCategoryFilter("adopted")}
                            >
                                {t("pets.filterAdopted")}
                            </button>
                        </div>

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
                            when={filteredPets().length > 0}
                            fallback={<div class={styles.noResults}>{t("pets.noPets")}</div>}
                        >
                            <For each={filteredPets()}>
                                {(pet) => (
                                    <A href={`/dashboard/pets/${pet.petId}`} class={styles.petCard}>
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
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextElementSibling?.removeAttribute('style');
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

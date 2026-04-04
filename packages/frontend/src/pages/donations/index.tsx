
import { batch, createSignal, onMount, Show, For } from "solid-js";
import { FaSolidSpinner } from "solid-icons/fa";
import { useSearchParams } from "@solidjs/router";

import req from "@/req";
import { useI18n } from "@/locales/i18n";

import styles from "./donations.module.scss";

export default function Donations() {
    const [t] = useI18n();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = createSignal(true);
    const [error, setError] = createSignal<string | null>(null);
    const [donations, setDonations] = createSignal<Objects.Donation[]>([]);

    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat("uk-UA", {
            style: "currency",
            currency: "UAH",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat("uk-UA", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(timestamp));
    };

    onMount(async () => {
        const request = await req<Api.GetDonationsResponse, Api.GetDonationsError>(`${window.API_URL}/donations`, {
            method: "GET",
        });

        if (request.error) {
            batch(() => {
                setError(t(request.error.status));
                setLoading(false);
            });
            return;
        }

        const response = request.data.split();
        if (response.error) {
            const responseError = await response.error.json();

            if (responseError.error) {
                batch(() => {
                    setError(responseError.error.message);
                    setLoading(false);
                });
                return;
            }

            batch(() => {
                setError(t(responseError.data.status));
                setLoading(false);
            });
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
            setDonations(json.data);
            setLoading(false);
        });
    });

    return (
        <div class={styles.pageContainer}>
            <div class={styles.contentWrapper}>
                <div class={styles.headerBlock}>
                    <h1>{t("donations.title")}</h1>
                    <p>{t("donations.subtitle")}</p>
                </div>

                <Show when={searchParams.success === "true"}>
                    <div class={styles.successNotice}>
                        <h3>{t("donations.success.title")}</h3>
                        <p>{t("donations.success.body")}</p>
                    </div>
                </Show>

                <Show when={loading()}>
                    <div class={styles.loadingSpinner}>
                        <FaSolidSpinner class="fa-spin" />
                    </div>
                </Show>

                <Show when={error() && !loading()}>
                    <div class={styles.errorBanner}>{error()}</div>
                </Show>

                <Show when={!loading() && !error()}>
                    <Show
                        when={donations().length > 0}
                        fallback={<div class={styles.emptyState}>{t("donations.empty")}</div>}
                    >
                        <div class={styles.donationsGrid}>
                            <For each={donations()}>
                                {(donation) => (
                                    <article class={styles.donationCard}>
                                        <div class={styles.cardHeader}>
                                            <h2>{donation.donorName}</h2>
                                            <span class={styles.amount}>{formatAmount(donation.amount)}</span>
                                        </div>

                                        <p class={styles.date}>{formatDate(donation.createdAt)}</p>

                                        <Show when={donation.message && donation.message.trim().length > 0}>
                                            <p class={styles.message}>{donation.message}</p>
                                        </Show>
                                    </article>
                                )}
                            </For>
                        </div>
                    </Show>
                </Show>
            </div>
        </div>
    );
}
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import { FaSolidSpinner } from "solid-icons/fa";

import req from "@/req";
import { useI18n } from "@/locales/i18n";

import styles from "./donation_success.module.scss";

export default function DonationSuccess() {
    const [t] = useI18n();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [error, setError] = createSignal<string | null>(null);

    const buildQueryFingerprint = () =>
        `${searchParams.amount ?? ""}|${searchParams.donor_name ?? ""}|${searchParams.message ?? ""}`;

    onMount(() => {
        void finalizeDonation();
    });

    const finalizeDonation = async () => {
        const amount = Number(searchParams.amount);
        if (!amount || Number.isNaN(amount) || amount <= 0) {
            setError(t("DONATION_INVALID_AMOUNT"));
            return;
        }

        const deduplicationKey = `donation-success:${buildQueryFingerprint()}`;
        if (window.sessionStorage.getItem(deduplicationKey) === "done") {
            navigate("/donations?success=true", { replace: true });
            return;
        }

        const request = await req<Api.CreateDonationResponse, Api.CreateDonationError>(`${window.API_URL}/donations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                amount,
                donorName: searchParams.donor_name,
                message: searchParams.message,
            }),
        });

        if (request.error) {
            setError(t(request.error.status));
            return;
        }

        const response = request.data.split();
        if (response.error) {
            const responseError = await response.error.json();

            if (responseError.error) {
                setError(responseError.error.message);
                return;
            }

            setError(t(responseError.data.status));
            return;
        }

        const json = await response.data.json();
        if (json.error) {
            setError(json.error.message);
            return;
        }

        window.sessionStorage.setItem(deduplicationKey, "done");
        navigate("/donations?success=true", { replace: true });
    };

    return (
        <div class={styles.pageContainer}>
            <div class={styles.card}>
                <Show
                    when={!error()}
                    fallback={(
                        <>
                            <h1>{t("donationSuccess.failedTitle")}</h1>
                            <p>{error()}</p>
                            <A href="/donations" class={styles.ctaButton}>
                                {t("donationSuccess.fallbackCta")}
                            </A>
                        </>
                    )}
                >
                    <div class={styles.spinnerWrap}>
                        <FaSolidSpinner class="fa-spin" />
                    </div>
                    <h1>{t("donationSuccess.processingTitle")}</h1>
                    <p>{t("donationSuccess.processingBody")}</p>
                </Show>
            </div>
        </div>
    );
}

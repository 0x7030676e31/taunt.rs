import { A } from "@solidjs/router";
import { useI18n } from "@/locales/i18n";
import { FaSolidPaw, FaSolidPlus, FaSolidFileSignature } from "solid-icons/fa";
import styles from "./dashboard.module.scss";

export default function Dashboard() {
    const [t] = useI18n();

    return (
        <div class={styles.dashboard}>
            <h1>{t("dashboard.welcome")}</h1>
            
            <div class={styles.cardsGrid}>
                <A href="/dashboard/pets" class={styles.card}>
                    <div class={styles.cardHeader}>
                        <div class={styles.cardIcon}><FaSolidPaw /></div>
                        <h2>{t("dashboard.petsList")}</h2>
                    </div>
                    <p>{t("dashboard.petsListDesc")}</p>
                </A>
                
                <A href="/dashboard/pets/add" class={styles.card}>
                    <div class={styles.cardHeader}>
                        <div class={styles.cardIcon}><FaSolidPlus /></div>
                        <h2>{t("dashboard.addPet")}</h2>
                    </div>
                    <p>{t("dashboard.addPetDesc")}</p>
                </A>
                
                <A href="/dashboard/applications" class={styles.card}>
                    <div class={styles.cardHeader}>
                        <div class={styles.cardIcon}><FaSolidFileSignature /></div>
                        <h2>{t("dashboard.applicationsList")}</h2>
                    </div>
                    <p>{t("dashboard.applicationsListDesc")}</p>
                </A>
            </div>
        </div>
    );
}

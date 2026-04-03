import { useI18n } from "@/locales/i18n";

import styles from "./home.module.scss";
import cat from "@/assets/cat_main.jpg";

export default function Home() {
    const [t] = useI18n();

    return (
        <div class={styles.home}>
            <div class={styles.catContainer}>
                <img src={cat} alt="Cute cat" class={styles.catImage} />
                <div class={styles.overlay}>
                    <div class={styles.supportBtn}>
                        <div class={styles.btnIcon}>
                            <svg viewBox="0 0 24 24">
                                <path
                                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </div>

                        <div class={styles.btnText}>
                            {t("home.support")}
                        </div>
                    </div>
                    <p class={styles.catCaption}>{t("home.catCaption")}</p>
                </div>
            </div>
        </div>
    );
}

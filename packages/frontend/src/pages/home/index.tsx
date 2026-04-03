import { useI18n } from "@/locales/i18n";

import styles from "./home.module.scss";
import cat from "@/assets/cat_main.jpg";

export default function Home() {
    const [t] = useI18n();

    return (
        <div class={styles.home}>
            <div class={styles.catContainer}>
                <img src={cat} alt="Cute cat" class={styles.catImage} />
                <p class={styles.catCaption}>{t("home.catCaption")}</p>
            </div>
        </div>
    );
}
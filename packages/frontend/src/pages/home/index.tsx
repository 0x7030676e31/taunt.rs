import { createSignal, Show } from "solid-js";
import { useI18n } from "@/locales/i18n";

import TextInput from "@/common/inputs/text-input";
import TextAreaInput from "@/common/inputs/textarea-input";
import Modal from "@/common/modal";

import styles from "./home.module.scss";
import cat from "@/assets/cat_main.jpg";
import team1 from "@/assets/team1.jpg";
import team2 from "@/assets/team2.jpg";
import team3 from "@/assets/team3.jpg";
import team4 from "@/assets/team4.jpg";
import team5 from "@/assets/team5.jpg";
import donate1 from "@/assets/cat_donate1.jpeg";
import donate2 from "@/assets/cat_donate2.jpeg";
import adopt1 from "@/assets/adopt1.jpeg";
import adopt2 from "@/assets/adopt2.jpeg";
import adopt3 from "@/assets/adopt3.jpeg";

export default function Home() {
    const [t] = useI18n();
    const currentYear = new Date().getFullYear();

    const AMOUNTS = [100, 500, 1000];
    const [selectedAmount, setSelectedAmount] = createSignal<number | "custom">(AMOUNTS[1]);
    const [customAmount, setCustomAmount] = createSignal("");
    const [message, setMessage] = createSignal("");
    const [name, setName] = createSignal("");

    const [isConfirmModalOpen, setIsConfirmModalOpen] = createSignal(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = createSignal(false);
    const [finalAmountToSubmit, setFinalAmountToSubmit] = createSignal(0);

    const trySubmit = () => {
        const finalAmount = selectedAmount() === "custom"
            ? Number(customAmount())
            : (selectedAmount() as number);

        if (!finalAmount || isNaN(finalAmount)) return;

        setFinalAmountToSubmit(finalAmount);

        if (!message().trim() || !name().trim()) {
            setIsConfirmModalOpen(true);
        } else {
            finalizeDonation();
        }
    };

    const handleDonate = (e: Event) => {
        e.preventDefault();
        trySubmit();
    };

    const finalizeDonation = () => {
        setIsConfirmModalOpen(false);
        setIsSuccessModalOpen(true);
        // Reset form
        setSelectedAmount(AMOUNTS[1]);
        setCustomAmount("");
        setMessage("");
        setName("");
    };

    return (
        <div class={styles.home}>
            <div class={styles.catContainer}>
                <img src={cat} alt="Cute cat" class={styles.catImage} />
                <div class={styles.overlay}>
                    <div class={styles.supportBtn} onClick={() => document.getElementById('donateSection')?.scrollIntoView({ behavior: 'smooth' })}>
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

            <div class={styles.contentSection}>
                <div class={styles.aboutBlock}>
                    <h2 class={styles.sectionTitle}>{t("home.about")}</h2>
                    <p class={styles.aboutText}>{t("home.about.text")}</p>
                </div>

                <div class={styles.teamBlock}>
                    <h2 class={styles.sectionTitle}>{t("home.team")}</h2>
                    <div class={styles.teamGrid}>
                        {[
                            { img: team1, name: "Olena" },
                            { img: team2, name: "Iryna" },
                            { img: team3, name: "Maksym" },
                            { img: team4, name: "Kateryna" },
                            { img: team5, name: "Dmytro" }
                        ].map((member) => (
                            <div class={styles.teamCard}>
                                <img src={member.img} alt={member.name} class={styles.teamImage} />
                                <div class={styles.memberName}>{member.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div id="donateSection" class={styles.donateSection}>
                <h2 class={styles.sectionTitle}>{t("home.donate")}</h2>
                <div class={styles.aboutBlock}>
                    <p class={styles.aboutText}>{t("home.donate.text")}</p>
                </div>

                <div class={styles.donateContainer}>
                    <div class={styles.donateImages}>
                        <img src={donate1} alt="Rescued cat 1" class={styles.donateImg1} />
                        <img src={donate2} alt="Rescued cat 2" class={styles.donateImg2} />
                    </div>

                    <form class={styles.donateForm} onSubmit={handleDonate}>
                        <div class={styles.formGroup}>
                            <label class={styles.donateLabel}>{t("home.donate.amount")}</label>
                            <div class={styles.presetAmounts}>
                                {AMOUNTS.map((amt) => (
                                    <button
                                        type="button"
                                        class={selectedAmount() === amt ? styles.selected : ''}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setSelectedAmount(amt);
                                        }}
                                    >
                                        ₴{amt}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    class={selectedAmount() === "custom" ? styles.selected : ''}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setSelectedAmount("custom");
                                    }}
                                >
                                    {t("home.donate.customAmount")}
                                </button>
                            </div>
                        </div>

                        <Show when={selectedAmount() === "custom"}>
                            <div class={styles.formGroup}>
                                <TextInput
                                    label={t("home.donate.customAmount")}
                                    type="text"
                                    inputmode="numeric"
                                    pattern="[0-9]*"
                                    min="1"
                                    step="1"
                                    placeholder={t("home.donate.customAmount")}
                                    value={customAmount()}
                                    class={styles.donateLabel}
                                    inputClass={styles.donateInput}
                                    onInput={(e) => {
                                        const cleaned = e.currentTarget.value.replace(/[^0-9]/g, "");
                                        e.currentTarget.value = cleaned;
                                        setCustomAmount(cleaned);
                                    }}
                                    onKeyDown={(e) => {
                                        // Block invalid non-digit keys instantly while allowing control keys
                                        if (e.key.length === 1 && !/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </div>
                        </Show>

                        <div class={styles.formGroup}>
                            <TextInput
                                label={t("home.donate.name")}
                                type="text"
                                placeholder={t("home.donate.name")}
                                value={name()}
                                class={styles.donateLabel}
                                inputClass={styles.donateInput}
                                onInput={(e) => setName(e.currentTarget.value)}
                            />
                        </div>

                        <div class={styles.formGroup}>
                            <TextAreaInput
                                label={t("home.donate.message")}
                                placeholder={t("home.donate.message")}
                                value={message()}
                                class={styles.donateLabel}
                                inputClass={styles.donateInput}
                                maxlength={512}
                                onInput={(e) => setMessage(e.currentTarget.value)}
                            />
                            <div class={styles.charCounter}>
                                {message().length} / 512
                            </div>
                        </div>

                        <button type="submit" class={styles.submitDonateBtn}>
                            {t("home.donate.submit")}
                        </button>
                    </form>
                </div>
            </div>

            <section class={styles.adoptionSpotlightSection}>
                <div class={styles.adoptionSpotlightInner}>
                    <div class={styles.adoptionCopy}>
                        <p class={styles.adoptionEyebrow}>{t("navbar.adopt")}</p>
                        <h2 class={styles.adoptionTitle}>{t("home.adopt.title")}</h2>
                        <p class={styles.adoptionSubtitle}>{t("home.adopt.subtitle")}</p>
                        <p class={styles.adoptionStory}>{t("home.adopt.story")}</p>
                        <a href="/adopt" class={styles.adoptCtaBtn}>
                            {t("home.adopt.cta")}
                        </a>
                    </div>

                    <div class={styles.adoptionPhotoGrid}>
                        <article class={styles.adoptionPhotoCard}>
                            <img src={adopt1} alt="Adoptable pet portrait 1" class={styles.adoptionPhoto} />
                        </article>
                        <article class={`${styles.adoptionPhotoCard} ${styles.featuredPhotoCard}`}>
                            <img src={adopt2} alt="Adoptable pet portrait 2" class={styles.adoptionPhoto} />
                        </article>
                        <article class={styles.adoptionPhotoCard}>
                            <img src={adopt3} alt="Adoptable pet portrait 3" class={styles.adoptionPhoto} />
                        </article>
                    </div>
                </div>
            </section>

            <Modal
                isOpen={isConfirmModalOpen()}
                onClose={() => setIsConfirmModalOpen(false)}
                title={t("home.donate.submit")}
            >
                <p>{t("home.donate.confirm_omitted")}</p>
                <div class={styles.modalActions}>
                    <button class={styles.modalBtnSecondary} onClick={() => setIsConfirmModalOpen(false)}>
                        {t("auth.close")}
                    </button>
                    <button class={styles.modalBtnPrimary} onClick={finalizeDonation}>
                        {t("home.donate.submit")}
                    </button>
                </div>
            </Modal>

            <Modal
                isOpen={isSuccessModalOpen()}
                onClose={() => setIsSuccessModalOpen(false)}
                title={t("home.donate.success")}
            >
                <p class={styles.successAmount}>
                    ₴{finalAmountToSubmit()}
                </p>
                <div class={styles.modalActions}>
                    <button class={styles.modalBtnPrimary} onClick={() => setIsSuccessModalOpen(false)}>
                        {t("auth.close")}
                    </button>
                </div>
            </Modal>

            <footer class={styles.siteFooter}>
                <div class={styles.footerInner}>
                    <p class={styles.footerTagline}>{t("home.footer.tagline")}</p>
                    <p class={styles.footerRights}>{t("home.footer.rights", { year: currentYear })}</p>
                </div>
            </footer>

        </div>
    );
}

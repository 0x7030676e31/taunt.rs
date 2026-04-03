import * as i18n from "@solid-primitives/i18n";
import { createContext, type ParentComponent, useContext } from "solid-js";

import en from "./en.json";
import ua from "./ua.json";

const enDictionary = i18n.flatten(en);
const uaDictionary = i18n.flatten(ua);

const dictionaries = {
    en: enDictionary,
    ua: uaDictionary,
};

type Locale = keyof typeof dictionaries;

function createTranslator(locale: Locale = "en") {
    return i18n.translator(() => dictionaries[locale], i18n.resolveTemplate);
}

type Translator = ReturnType<typeof createTranslator>;

const I18nContext = createContext<Translator | undefined>(undefined);

export const I18nProvider: ParentComponent<{ locale?: Locale }> = props => {
    const translate = createTranslator(props.locale ?? "en");

    return I18nContext.Provider({
        value: translate,
        get children() {
            return props.children;
        },
    });
};

export function useI18n() {
    const translate = useContext(I18nContext);

    if (!translate) {
        throw new Error("useI18n must be used within I18nProvider");
    }

    return [translate] as const;
}
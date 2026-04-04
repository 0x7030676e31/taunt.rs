import * as i18n from "@solid-primitives/i18n";
import {
    createContext,
    createSignal,
    type ParentComponent,
    useContext,
    type Accessor,
    type Setter,
} from "solid-js";

import en from "./en.json";
import ua from "./ua.json";
import uaLatin from "./ua-latin.json";

const enDictionary = i18n.flatten(en);
const uaDictionary = i18n.flatten(ua as typeof en);
const uaLatinDictionary = i18n.flatten(uaLatin as typeof en);

const dictionaries = {
    en: enDictionary,
    ua: uaDictionary,
    uaLatin: uaLatinDictionary,
};

export type Locale = keyof typeof dictionaries;

function createTranslator(locale: Accessor<Locale>) {
    return i18n.translator(() => dictionaries[locale()], i18n.resolveTemplate);
}

type Translator = ReturnType<typeof createTranslator>;
type I18nContextValue = readonly [Translator, Accessor<Locale>, Setter<Locale>];

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider: ParentComponent<{ locale?: Locale }> = props => {
    const [locale, setLocale] = createSignal<Locale>(props.locale ?? "en");
    const translate = createTranslator(locale);

    return I18nContext.Provider({
        value: [translate, locale, setLocale],
        get children() {
            return props.children;
        },
    });
};

export function useI18n() {
    const context = useContext(I18nContext);

    if (!context) {
        throw new Error("useI18n must be used within I18nProvider");
    }

    return context;
}

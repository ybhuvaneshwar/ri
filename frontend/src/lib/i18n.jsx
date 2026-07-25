import React, { createContext, useContext, useState, useEffect } from "react";

const TRANSLATIONS = {
  en: {
    "app.tagline": "Command Center",
    "nav.dashboard": "Command Center",
    "nav.cases": "Cases & FIRs",
    "nav.kavacha": "Kavacha AI",
    "nav.analytics": "Analytics",
    "nav.network": "Criminal Network",
    "nav.map": "Map Intelligence",
    "nav.predictions": "Predictions",
    "nav.reports": "Reports",
    "nav.uploads": "Data Ingestion",
    "nav.users": "Users & Roles",
    "nav.audit": "Audit Log",
    "nav.alerts": "Alerts",
    "common.live": "Live",
    "common.quickJump": "Quick jump",
    "common.logout": "Logout",
    "common.askKavacha": "Ask Kavacha AI",
    "common.online": "Online",
    "common.offline": "Offline · queued writes will sync on reconnect",
    "common.language": "Language",
    "common.send": "Send",
    "common.openCase": "Open case",
    "common.confidence": "confidence",
    "common.reason": "Why",
  },
  kn: {
    "app.tagline": "ಕಮಾಂಡ್ ಸೆಂಟರ್",
    "nav.dashboard": "ಕಮಾಂಡ್ ಸೆಂಟರ್",
    "nav.cases": "ಪ್ರಕರಣಗಳು ಮತ್ತು ಎಫ್‌ಐಆರ್",
    "nav.kavacha": "ಕವಚ AI",
    "nav.analytics": "ವಿಶ್ಲೇಷಣೆ",
    "nav.network": "ಅಪರಾಧಿ ಜಾಲ",
    "nav.map": "ನಕ್ಷೆ ಬುದ್ಧಿಮತ್ತೆ",
    "nav.predictions": "ಮುನ್ಸೂಚನೆಗಳು",
    "nav.reports": "ವರದಿಗಳು",
    "nav.uploads": "ಡೇಟಾ ಸೇರ್ಪಡೆ",
    "nav.users": "ಬಳಕೆದಾರರು ಮತ್ತು ಪಾತ್ರಗಳು",
    "nav.audit": "ಆಡಿಟ್ ಲಾಗ್",
    "nav.alerts": "ಎಚ್ಚರಿಕೆಗಳು",
    "common.live": "ನೇರ",
    "common.quickJump": "ತ್ವರಿತ ಜಿಗಿತ",
    "common.logout": "ಲಾಗ್ ಔಟ್",
    "common.askKavacha": "ಕವಚ AI ಗೆ ಕೇಳಿ",
    "common.online": "ಆನ್‌ಲೈನ್",
    "common.offline": "ಆಫ್‌ಲೈನ್ · ಸಂಪರ್ಕದ ನಂತರ ಸಿಂಕ್ ಆಗುತ್ತದೆ",
    "common.language": "ಭಾಷೆ",
    "common.send": "ಕಳುಹಿಸಿ",
    "common.openCase": "ಪ್ರಕರಣ ತೆರೆಯಿರಿ",
    "common.confidence": "ವಿಶ್ವಾಸ",
    "common.reason": "ಏಕೆ",
  },
};

const I18nCtx = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("nk_lang") || "en");
  useEffect(() => { localStorage.setItem("nk_lang", lang); document.documentElement.lang = lang; }, [lang]);
  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}
export const useI18n = () => useContext(I18nCtx);

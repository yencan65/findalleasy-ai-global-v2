
// Minimal i18n: auto from browser, selectable
export const LOCALES = {
  tr: {
    slogan: "Dünyanın her yerinde en uygun fiyat",
    search: "Ara",
    hint: "Tarayıcı diliniz otomatik algılanır. Dilerseniz sağdan değiştirebilirsiniz."
  },
  en: {
    slogan: "Best price anywhere in the world",
    search: "Search",
    hint: "Your browser language is detected automatically. You can change it from the right."
  },
  de: {
    slogan: "Bester Preis weltweit",
    search: "Suchen",
    hint: "Ihre Browsersprache wird automatisch erkannt. Sie können sie rechts ändern."
  },
  fr: {
    slogan: "Meilleur prix dans le monde",
    search: "Rechercher",
    hint: "La langue du navigateur est détectée automatiquement. Vous pouvez la changer à droite."
  },
  ar: {
    slogan: "أفضل سعر في أي مكان في العالم",
    search: "ابحث",
    hint: "يتم اكتشاف لغة المتصفح تلقائياً. يمكنك تغييرها من اليمين."
  }
};

export function detectLocale() {
  const nav = (navigator.language || "en").slice(0,2).toLowerCase();
  if (LOCALES[nav]) return nav;
  return "en";
}

export function applyLocale(loc) {
  const dict = LOCALES[loc] || LOCALES.en;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  document.documentElement.lang = loc;
}

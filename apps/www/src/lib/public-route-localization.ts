import type { SupportedLocale } from "@score/i18n";

export type PublicNotFoundCopy = {
  eyebrow: string;
  title: string;
  body: string;
  home: string;
  faq: string;
  support: string;
  access: string;
};

const notFoundCatalogs = {
  en: {
    eyebrow: "Page not found",
    title: "This public page does not exist. Use one of the live entry points instead.",
    body: "If you landed here from search or an older link, return to the homepage, FAQ, support, or access options.",
    home: "Back to homepage",
    faq: "FAQ",
    support: "Support",
    access: "Access options",
  },
  "zh-CN": {
    eyebrow: "页面未找到",
    title: "这个公开页面不存在，请从现有入口继续",
    body: "如果你是从搜索结果或旧链接进入的，可以返回首页、常见问题、支持页或开通路径。",
    home: "返回首页",
    faq: "常见问题",
    support: "支持页",
    access: "开通路径",
  },
  "zh-TW": {
    eyebrow: "找不到頁面",
    title: "這個公開頁面不存在，請從現有入口繼續",
    body: "如果你是從搜尋結果或舊連結進入，可以返回首頁、常見問題、支援頁或方案選項。",
    home: "返回首頁",
    faq: "常見問題",
    support: "支援",
    access: "方案選項",
  },
  ja: {
    eyebrow: "ページが見つかりません",
    title: "この公開ページは存在しません。利用可能な入口から続けてください。",
    body: "検索結果や古いリンクから来た場合は、ホーム、よくある質問、サポート、または利用プランへ戻れます。",
    home: "ホームへ戻る",
    faq: "よくある質問",
    support: "サポート",
    access: "利用プラン",
  },
  ko: {
    eyebrow: "페이지를 찾을 수 없음",
    title: "요청한 공개 페이지가 없습니다. 현재 제공되는 경로에서 계속해 주세요.",
    body: "검색 결과나 이전 링크로 들어왔다면 홈, 자주 묻는 질문, 지원 또는 이용 옵션으로 이동할 수 있습니다.",
    home: "홈으로 돌아가기",
    faq: "자주 묻는 질문",
    support: "지원",
    access: "이용 옵션",
  },
  fr: {
    eyebrow: "Page introuvable",
    title: "Cette page publique n’existe pas. Utilisez l’un des accès disponibles.",
    body: "Si vous venez d’un résultat de recherche ou d’un ancien lien, revenez à l’accueil, à la FAQ, à l’assistance ou aux options d’accès.",
    home: "Retour à l’accueil",
    faq: "FAQ",
    support: "Assistance",
    access: "Options d’accès",
  },
  es: {
    eyebrow: "Página no encontrada",
    title: "Esta página pública no existe. Continúa desde una de las rutas disponibles.",
    body: "Si llegaste desde un buscador o un enlace antiguo, vuelve al inicio, a las preguntas frecuentes, al soporte o a las opciones de acceso.",
    home: "Volver al inicio",
    faq: "Preguntas frecuentes",
    support: "Soporte",
    access: "Opciones de acceso",
  },
  de: {
    eyebrow: "Seite nicht gefunden",
    title: "Diese öffentliche Seite existiert nicht. Nutze stattdessen einen der verfügbaren Einstiege.",
    body: "Wenn du über eine Suche oder einen alten Link hierhergekommen bist, gehe zur Startseite, zu den FAQ, zum Support oder zu den Zugangsoptionen.",
    home: "Zur Startseite",
    faq: "FAQ",
    support: "Support",
    access: "Zugangsoptionen",
  },
  ru: {
    eyebrow: "Страница не найдена",
    title: "Этой общедоступной страницы нет. Перейдите к одному из действующих разделов.",
    body: "Если вы пришли из поиска или по старой ссылке, вернитесь на главную, откройте ответы на вопросы, поддержку или варианты доступа.",
    home: "На главную",
    faq: "Вопросы и ответы",
    support: "Поддержка",
    access: "Варианты доступа",
  },
} as const satisfies Record<SupportedLocale, PublicNotFoundCopy>;

export function getPublicNotFoundCopy(locale: SupportedLocale): PublicNotFoundCopy {
  return notFoundCatalogs[locale];
}

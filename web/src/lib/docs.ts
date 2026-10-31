import type { Lang } from "./i18n";

type Doc = { title: string; body: string[] };
// Arabic copy is drafted for review by a native speaker before wide promotion.
export const DOCS: Record<string, Record<Lang, Doc>> = {
  about: {
    en: { title: "About Qarin", body: [
      "Qarin (قارن, “compare”) shows you what the same electronics product costs at the stores across Bahrain, the UAE, Saudi Arabia, Kuwait, Qatar and Oman — and how that price has moved over time.",
      "We read the prices stores publish on their own websites every day, match identical products across stores (same model and storage — colour is shown as a variant), and keep the full price history so you can tell a real deal from a fake one.",
      "We are independent. Stores cannot pay to appear higher in a price list: the cheapest in-stock price is always first.",
      "Contact: hussainnasser.bahrain@gmail.com",
    ] },
    ar: { title: "عن قارن", body: [
      "قارن يوضح لك سعر نفس منتج الإلكترونيات في المحلات في البحرين والإمارات والسعودية والكويت وقطر وعُمان — وكيف تغيّر سعره مع الوقت.",
      "نقرأ الأسعار اللي تنشرها المحلات في مواقعها كل يوم، ونطابق المنتجات المتطابقة بين المحلات (نفس الموديل ونفس السعة — واللون يظهر كخيار)، ونحفظ سجل الأسعار كامل عشان تفرّق بين العرض الحقيقي والوهمي.",
      "قارن مستقل. ما يقدر أي محل يدفع عشان يطلع أعلى في قائمة الأسعار: الأرخص المتوفر دائماً أولاً.",
      "للتواصل: hussainnasser.bahrain@gmail.com",
    ] },
  },
  "how-we-make-money": {
    en: { title: "How we make money", body: [
      "Qarin is free for shoppers. We may earn money in three ways, and none of them changes the order of prices:",
      "1. Cost per click — a store may pay a small fee when you click “Go to store” on its offer.",
      "2. Affiliate commission — some links (for example to marketplaces) may earn us a commission if you buy. These links are marked rel=\"sponsored\".",
      "3. Clearly labelled advertising, if we ever show it. Ads are always marked as ads and never appear inside a price table.",
      "The cheapest in-stock price is always shown first, whether or not that store pays us.",
    ] },
    ar: { title: "كيف نربح", body: [
      "قارن مجاني للمتسوقين. ممكن نربح بثلاث طرق، ولا وحدة منها تغيّر ترتيب الأسعار:",
      "١. الدفع مقابل النقرة — ممكن يدفع المحل رسوم بسيطة لما تضغط «اذهب للمحل» على عرضه.",
      "٢. عمولة الإحالة — بعض الروابط (مثل روابط المتاجر الإلكترونية الكبيرة) ممكن تعطينا عمولة إذا اشتريت. هذي الروابط معلّمة rel=\"sponsored\".",
      "٣. إعلانات واضحة إذا عرضناها مستقبلاً. الإعلان دائماً مكتوب عليه إعلان وما يظهر داخل جدول الأسعار.",
      "الأرخص المتوفر يظهر أولاً دائماً، سواء دفع لنا المحل أو لا.",
    ] },
  },
  privacy: {
    en: { title: "Privacy", body: [
      "We do not sell personal data. We do not use advertising cookies.",
      "Analytics: if you choose “Accept”, we use Vercel Web Analytics, which is cookieless and aggregates visits. If you decline, it does not load.",
      "Price alerts: we store your email, the product and your target price only to send the alert. Every email has a one-click unsubscribe link; unsubscribing stops all emails for that alert.",
      "Clicks: when you click “Go to store”, we record the offer, time, country and a one-way hash of your browser's user-agent (not your IP address) to count visits we send to stores.",
      "Reports and store sign-ups: we keep what you submit to handle it.",
      "To delete your data, email hussainnasser.bahrain@gmail.com. This policy follows the principles of Saudi Arabia's PDPL and the UAE's Federal Decree-Law 45/2021.",
    ] },
    ar: { title: "الخصوصية", body: [
      "ما نبيع البيانات الشخصية، وما نستخدم ملفات تعريف إعلانية.",
      "الإحصائيات: إذا اخترت «موافق» نستخدم Vercel Web Analytics، وهي بدون ملفات تعريف وتجمع الزيارات بشكل إجمالي. إذا رفضت ما يتم تحميلها.",
      "تنبيهات الأسعار: نحفظ بريدك والمنتج والسعر المطلوب فقط لإرسال التنبيه. كل رسالة فيها رابط إلغاء بضغطة وحدة.",
      "النقرات: لما تضغط «اذهب للمحل» نسجّل العرض والوقت والدولة وبصمة غير قابلة للعكس من متصفحك (وليس عنوان IP) لعدّ الزيارات اللي نرسلها للمحلات.",
      "البلاغات وطلبات المحلات: نحتفظ بما ترسله للتعامل معه.",
      "لحذف بياناتك راسلنا على hussainnasser.bahrain@gmail.com. تتبع هذه السياسة مبادئ نظام حماية البيانات الشخصية في السعودية والمرسوم بقانون اتحادي ٤٥/٢٠٢١ في الإمارات.",
    ] },
  },
  terms: {
    en: { title: "Terms of use", body: [
      "Prices, stock and product details come from the stores' own websites and may change at any time. The price shown by the store at checkout is the final price. Qarin is not the seller and is not responsible for a store's products, delivery, warranty or returns.",
      "We try hard to group only identical products. If you see a mistake, use “Report a problem” on the product page.",
      "Product names and trademarks belong to their owners. Product images are shown to help you identify the product and link to the store.",
      "You may not scrape or copy Qarin's database in bulk.",
    ] },
    ar: { title: "شروط الاستخدام", body: [
      "الأسعار والتوفر وتفاصيل المنتجات مأخوذة من مواقع المحلات نفسها وممكن تتغير في أي وقت. السعر اللي يعرضه المحل عند الدفع هو السعر النهائي. قارن ليس البائع وغير مسؤول عن منتجات المحل أو التوصيل أو الضمان أو الاسترجاع.",
      "نحرص على تجميع المنتجات المتطابقة فقط. إذا شفت خطأ استخدم «أبلغ عن مشكلة» في صفحة المنتج.",
      "أسماء المنتجات والعلامات التجارية ملك لأصحابها. صور المنتجات تُعرض للتعريف بالمنتج مع رابط للمحل.",
      "يُمنع نسخ قاعدة بيانات قارن أو سحبها بشكل جماعي.",
    ] },
  },
  bot: {
    en: { title: "QarinBot — our crawler", body: [
      "QarinBot reads the product information that stores publish for search engines (schema.org data in their product pages and their public sitemaps).",
      "It identifies itself honestly with the user-agent “QarinBot/1.0 (+https://qarin.vercel.app/en/bot)”, obeys robots.txt and Crawl-delay, waits at least 1.5 seconds between requests to a store, and never runs two crawls of the same store at once.",
      "If a site blocks or rate-limits it, it stops. It never disguises itself, solves CAPTCHAs, or uses private APIs or keys.",
      "Store owners: to stop QarinBot, add “User-agent: QarinBot / Disallow: /” to robots.txt, or email us. To send us a product feed instead (faster, more accurate), use “List your store”.",
    ] },
    ar: { title: "QarinBot — زاحف قارن", body: [
      "يقرأ QarinBot معلومات المنتجات اللي تنشرها المحلات لمحركات البحث (بيانات schema.org في صفحات المنتجات وخرائط الموقع العامة).",
      "يعرّف عن نفسه بصدق باسم «QarinBot/1.0»، ويلتزم بملف robots.txt و Crawl-delay، وينتظر ١٫٥ ثانية على الأقل بين الطلبات، وما يزحف على نفس المحل مرتين بنفس الوقت.",
      "إذا منعه الموقع أو حدّ من طلباته يتوقف. ما يتنكر، وما يحل اختبارات CAPTCHA، وما يستخدم واجهات أو مفاتيح خاصة.",
      "لأصحاب المحلات: لإيقاف QarinBot أضيفوا «User-agent: QarinBot / Disallow: /» في robots.txt أو راسلونا. ولإرسال ملف منتجات بدلاً من ذلك (أسرع وأدق) استخدموا «أضف محلك».",
    ] },
  },
};

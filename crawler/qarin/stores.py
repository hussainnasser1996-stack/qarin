"""Store registry. One entry per (retailer, country) storefront.

sitemaps:      roots to start from (robots.txt Sitemap: lines are used when empty)
child_filter:  regex a child sitemap URL must match to be followed (country/language/product maps)
product_re:    regex a <loc> must match to count as a product page
url_include:   optional regex on the product URL slug to pre-filter electronics (saves crawl budget)
adapter:       parser in adapters.py
"""
from dataclasses import dataclass, field

# Broad electronics vocabulary for URL slugs (EN). Pages that fail this are still checked by
# the title classifier after fetch when url_include is None.
ELEC = (
    r"phone|iphone|galaxy|mobile|smartphone|tablet|ipad|laptop|notebook|macbook|chromebook|computer|desktop|"
    r"imac|mac-mini|monitor|printer|tv-|-tv|television|oled|qled|soundbar|speaker|headphone|headset|earbud|earphone|"
    r"airpods|audio|smartwatch|watch|wearable|camera|lens|drone|gopro|insta360|console|playstation|ps5|ps4|xbox|"
    r"nintendo|switch-2|gaming|dualsense|controller|router|mesh|ssd|hard-drive|hdd|memory-card|flash-drive|"
    r"power-bank|projector|kindle|e-reader|vr|quest|pixel|xiaomi|redmi|honor|huawei|oneplus|oppo|vivo|realme|"
    r"nothing-phone|dyson|vacuum|graphics-card|gpu|processor|keyboard|mouse|webcam|microphone|streaming"
)


@dataclass
class Store:
    id: str
    country: str
    name: str
    domain: str
    adapter: str
    sitemaps: list[str]
    product_re: str
    child_filter: str = ""
    url_include: str | None = ELEC
    min_delay: float = 1.5
    logo: str = ""
    home: str = ""
    notes: str = ""
    active: bool = True
    extra: dict = field(default_factory=dict)


STORES: list[Store] = [
    # ---------------- Bahrain ----------------
    Store("sharafdg-bh", "bh", "Sharaf DG", "bahrain.sharafdg.com", "microdata",
          ["https://bahrain.sharafdg.com/bahrain-sitemap.xml"], r"/product/", child_filter=r"product",
          home="https://bahrain.sharafdg.com/"),
    Store("extra-bh", "bh", "eXtra", "www.extra.com", "jsonld",
          ["https://www.extra.com/en-bh/sitemap.xml"], r"/en-bh/.+/p/\d+", child_filter=r"en-bh.*[Pp]roduct|Product-en-BHD",
          url_include=None, home="https://www.extra.com/en-bh"),
    Store("jarir-bh", "bh", "Jarir", "www.jarir.com", "jsonld",
          ["https://www.jarir.com/bh-en/sitemap_bh_en.xml"], r"/bh-en/.+\.html$", child_filter=r"bh_en_product",
          home="https://www.jarir.com/bh-en/"),
    Store("ashrafs-bh", "bh", "Ashrafs", "www.ashrafsbahrain.com", "jsonld",
          ["https://www.ashrafsbahrain.com/sitemap.xml"], r"\.html$", home="https://www.ashrafsbahrain.com/"),
    # ---------------- UAE ----------------
    Store("sharafdg-ae", "ae", "Sharaf DG", "uae.sharafdg.com", "microdata",
          ["https://uae.sharafdg.com/uae-sitemap.xml"], r"/product/", child_filter=r"product",
          home="https://uae.sharafdg.com/"),
    Store("jumbo-ae", "ae", "Jumbo", "www.jumbo.ae", "jsonld",
          ["https://www.jumbo.ae/sitemap.xml"], r"jumbo\.ae/(?!ar/).+\.html$", home="https://www.jumbo.ae/"),
    # ---------------- Saudi Arabia ----------------
    Store("extra-sa", "sa", "eXtra", "www.extra.com", "jsonld",
          ["https://www.extra.com/en-sa/sitemap.xml"], r"/en-sa/.+/p/\d+", child_filter=r"en-sa.*[Pp]roduct|Product-en-SAR",
          url_include=None, home="https://www.extra.com/en-sa"),
    Store("jarir-sa", "sa", "Jarir", "www.jarir.com", "jsonld",
          ["https://www.jarir.com/sa-en/sitemap_sa_en.xml"], r"/sa-en/.+\.html$", child_filter=r"sa_en_product",
          home="https://www.jarir.com/sa-en/"),
    Store("almanea-sa", "sa", "Almanea", "www.almanea.sa", "jsonld",
          ["https://www.almanea.sa/index_sitemap.xml"], r"almanea\.sa/(en/)?product/|almanea\.sa/[^/]+$",
          child_filter=r"product|gtin", url_include=None, home="https://www.almanea.sa/"),
    Store("saco-sa", "sa", "SACO", "www.saco.sa", "jsonld",
          ["https://www.saco.sa/sitemap_en.xml"], r"saco\.sa/en/", home="https://www.saco.sa/en/"),
    Store("alsaif-sa", "sa", "Al Saif Gallery", "alsaifgallery.com", "jsonld",
          ["https://alsaifgallery.com/media/sitemap/SA_en_index.xml"], r"/SA_en/.+", child_filter=r"SA_en",
          home="https://alsaifgallery.com/SA_en/"),
    # ---------------- Kuwait ----------------
    Store("jarir-kw", "kw", "Jarir", "www.jarir.com", "jsonld",
          ["https://www.jarir.com/kw-en/sitemap_kw_en.xml"], r"/kw-en/.+\.html$", child_filter=r"kw_en_product",
          home="https://www.jarir.com/kw-en/"),
    Store("xcite-kw", "kw", "Xcite", "xcite.com", "xcite",
          ["https://xcite.com/sitemaps/sitemap-index.xml"], r"xcite\.com/(?!ar/).+/p$|xcite\.com/(?!ar/)[^?]+",
          child_filter=r"pdps", home="https://www.xcite.com/"),
    Store("eureka-kw", "kw", "Eureka", "www.eureka.com.kw", "eureka",
          ["https://www.eureka.com.kw/products-sitemap.xml"], r"eureka\.com\.kw/.+", child_filter=r"product",
          home="https://www.eureka.com.kw/"),
    # ---------------- Qatar ----------------
    Store("jarir-qa", "qa", "Jarir", "www.jarir.com", "jsonld",
          ["https://www.jarir.com/qa-en/sitemap_qa_en.xml"], r"/qa-en/.+\.html$", child_filter=r"qa_en_product",
          home="https://www.jarir.com/qa-en/"),
    Store("jumbosouq-qa", "qa", "JumboSouq", "js.qa", "jsonld",
          ["https://js.qa/sitemap/sitemap.xml"], r"js\.qa/(?!ar/).+", child_filter=r"en|product|sitemap",
          home="https://js.qa/"),
    Store("ansar-qa", "qa", "Ansar Gallery", "www.ansargallery.com", "jsonld",
          ["https://a278531.sitemaphosting3.com/4268814/sitemap_4268814.xml"], r"ansargallery\.com/en/",
          home="https://www.ansargallery.com/en/"),
    # ---------------- Oman ----------------
    Store("sharafdg-om", "om", "Sharaf DG", "oman.sharafdg.com", "microdata",
          ["https://oman.sharafdg.com/oman-sitemap.xml"], r"/product/", child_filter=r"product",
          home="https://oman.sharafdg.com/"),
    Store("extra-om", "om", "eXtra", "www.extra.com", "jsonld",
          ["https://www.extra.com/en-om/sitemap.xml"], r"/en-om/.+/p/\d+", child_filter=r"en-om.*[Pp]roduct|Product-en-OMR",
          url_include=None, home="https://www.extra.com/en-om"),
]

BY_ID = {s.id: s for s in STORES}

COUNTRIES = {
    "bh": {"currency": "BHD", "vat": 10, "en": "Bahrain", "ar": "البحرين", "decimals": 3},
    "ae": {"currency": "AED", "vat": 5, "en": "UAE", "ar": "الإمارات", "decimals": 2},
    "sa": {"currency": "SAR", "vat": 15, "en": "Saudi Arabia", "ar": "السعودية", "decimals": 2},
    "kw": {"currency": "KWD", "vat": 0, "en": "Kuwait", "ar": "الكويت", "decimals": 3},
    "qa": {"currency": "QAR", "vat": 0, "en": "Qatar", "ar": "قطر", "decimals": 2},
    "om": {"currency": "OMR", "vat": 5, "en": "Oman", "ar": "عُمان", "decimals": 3},
}

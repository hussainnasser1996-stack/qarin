"""Text normalisation, category classification and product-identity keys.

The identity key is what makes two offers "the same product": same brand, same model family,
same storage (colour is a variant, not a different product). Accessories never inherit the key
of the device they fit ("case for iPhone 17" is not an iPhone 17).
"""
from __future__ import annotations

import re
import unicodedata

# ---------------------------------------------------------------- Arabic / search normalisation
AR_DIAC = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
AR_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")


def search_norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s or "").lower().translate(AR_DIGITS)
    s = AR_DIAC.sub("", s)
    s = re.sub("[إأآٱ]", "ا", s).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    s = re.sub(r"[^\w\s+.]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:80] or "item"


# ---------------------------------------------------------------- brands
BRANDS = [
    "apple", "samsung", "sony", "microsoft", "nintendo", "google", "xiaomi", "redmi", "poco", "huawei", "honor",
    "oneplus", "oppo", "vivo", "realme", "nothing", "motorola", "nokia", "tecno", "infinix", "lenovo", "hp", "dell",
    "asus", "acer", "msi", "razer", "lg", "tcl", "hisense", "philips", "panasonic", "sharp", "toshiba", "bose", "jbl",
    "beats", "sennheiser", "marshall", "anker", "soundcore", "belkin", "logitech", "garmin", "fitbit", "amazfit",
    "canon", "nikon", "fujifilm", "gopro", "dji", "insta360", "meta", "dyson", "braun", "tefal", "nespresso",
    "kenwood", "black+decker", "western digital", "sandisk", "seagate", "kingston", "crucial", "tp-link", "netgear",
    "d-link", "epson", "brother", "hp", "sony", "playstation", "xbox", "alienware", "steelseries", "hyperx",
    "corsair", "jabra", "skullcandy", "harman kardon", "bang & olufsen", "devialet", "ugreen", "baseus", "elago",
]
BRAND_ALIASES = {"playstation": "sony", "xbox": "microsoft", "redmi": "xiaomi", "poco": "xiaomi", "beats": "apple",
                 "alienware": "dell", "soundcore": "anker", "سامسونج": "samsung", "ابل": "apple", "آبل": "apple",
                 "سوني": "sony", "هواوي": "huawei", "شاومي": "xiaomi", "هونر": "honor", "لينوفو": "lenovo"}


def detect_brand(brand_field: str | None, title: str) -> str | None:
    t = f" {search_norm(title)} "
    if brand_field:
        b = search_norm(brand_field)
        b = BRAND_ALIASES.get(b, b)
        if b in BRANDS or len(b) > 1:
            if b in BRANDS:
                return BRAND_ALIASES.get(b, b)
    for b in BRANDS:
        if f" {b} " in t:
            return BRAND_ALIASES.get(b, b)
    # implied brands
    if re.search(r"\b(iphone|ipad|macbook|airpods|imac|apple watch)\b", t):
        return "apple"
    if re.search(r"\bgalaxy\b", t):
        return "samsung"
    if re.search(r"\b(ps5|ps4|dualsense|playstation)\b", t):
        return "sony"
    if re.search(r"\bpixel\b", t):
        return "google"
    if brand_field:
        b = search_norm(brand_field)
        return BRAND_ALIASES.get(b, b) or None
    return None


# ---------------------------------------------------------------- categories
ACCESSORY_RE = re.compile(
    r"\b(case|cover|protector|screen guard|tempered|glass|strap|band|bands|charger|charging (cable|pad|stand|dock)|"
    r"cable|adapter|adaptor|stand|holder|mount|skin|pouch|sleeve|film|lens protector|replacement|tips|keyboard folio|"
    r"compatible with|for iphone|for ipad|for samsung|for galaxy|for airpods|for macbook|for apple watch|for ps5|"
    r"for nintendo|for switch|for playstation|for xbox|magsafe wallet|wallet|bumper|grip|thumb grips|decal|sticker|tripod|selfie stick|gimbal for|"
    r"for smartphones?|for phones?|for mobile|phone holder|car holder|power ?bank|screen protector|earbuds case)\b"
)
CATEGORY_RULES: list[tuple[str, str]] = [
    ("gaming", r"\b(dualsense|controller|gamepad|joystick|pulse (3d|elite|explore)|playstation portal|ps5 portal|portal remote|disc drive|"
               r"hd camera|stick module|charging station|racing wheel|headset|vr2|psvr)\b"),
    ("gaming-consoles", r"\b((ps5|playstation ?5)( pro| slim)?( digital| disc)?( edition)?( console| gaming console)|ps5 (pro|slim)|playstation 5 (pro|slim)|"
                        r"xbox series [xs]( console)?|nintendo switch( 2| oled| lite)( console)?|nintendo switch console|steam deck|rog ally|legion go)\b"),
    ("phones", r"\b(iphone \d|iphone air|iphone se|galaxy (s|a|m|z ?fold|z ?flip|note)\s?\d|pixel \d|smartphone|mobile phone|redmi note|honor magic|honor \d|huawei (mate|pura|nova|p)\s?\d|oneplus \d|nothing phone)"),
    ("tablets", r"\b(ipad|galaxy tab|tablet|matepad|xiaomi pad|redmi pad|kindle|e-?reader)\b"),
    ("laptops", r"\b(macbook|laptop|notebook|chromebook|ultrabook|zenbook|vivobook|thinkpad|ideapad|yoga slim|pavilion|envy|spectre|xps|inspiron|aspire|swift|predator|rog|tuf gaming|legion|omen|victus)\b"),
    ("desktops", r"\b(imac|mac mini|mac studio|desktop|all-in-one|aio pc|gaming pc)\b"),
    ("monitors", r"\b(monitor)\b"),
    ("tvs", r"\b(tv|television|oled|qled|neo qled|mini led|uhd|4k smart|google tv|android tv)\b"),
    ("headphones", r"\b(airpods|headphones?|earbuds?|earphones?|headset|in-ear|over-ear|wh-1000|wf-1000|buds)\b"),
    ("speakers", r"\b(speaker|soundbar|sound bar|home theatre|home theater|subwoofer)\b"),
    ("wearables", r"\b(smart ?watch|apple watch|galaxy watch|watch (series|ultra|se)|fitness tracker|smart band|whoop|garmin)\b"),
    ("cameras", r"\b(camera|dslr|mirrorless|gopro|insta360|osmo|action cam|lens|drone|gimbal)\b"),
    ("gaming", r"\b(dualsense|controller|gamepad|gaming (mouse|keyboard|headset|chair)|ps5 game|xbox game|nintendo game|playstation portal)\b"),
    ("smart-home", r"\b(smart (plug|bulb|lock|home)|echo dot|alexa|google home|nest|ring doorbell|security camera)\b"),
    ("storage", r"\b(ssd|hard drive|hdd|memory card|micro ?sd|usb flash|flash drive)\b"),
    ("networking", r"\b(router|mesh wifi|wi-fi system|access point|range extender|modem)\b"),
    ("printers", r"\b(printer|ink cartridge|toner)\b"),
    ("small-appliances", r"\b(vacuum|airwrap|hair dryer|straightener|air fryer|coffee machine|espresso|blender|air purifier|shaver|trimmer)\b"),
]
ELECTRONIC_CRUMB_RE = re.compile(
    r"mobile|phone|tablet|computer|laptop|gaming|game|tv|audio|headphone|camera|wearable|watch|smart|electronic|"
    r"appliance|network|printer|storage|monitor|accessor|جوال|هواتف|الكترون|إلكترون|العاب|ألعاب|كمبيوتر|تلفزيون|سماعات",
    re.I,
)


def classify(title: str, crumbs: list[str] | None = None, url: str = "") -> tuple[str | None, bool]:
    """Return (category, is_accessory). category None = not electronics."""
    t = search_norm(title)
    crumb_txt = " ".join(crumbs or []).lower()
    is_acc = bool(ACCESSORY_RE.search(t)) and not re.search(r"\b(console|smartphone|laptop)\b", t)
    if "access" in crumb_txt and not re.search(r"console|smartphone", t):
        is_acc = True
    if is_acc:
        return "accessories", True
    for cat, rx in CATEGORY_RULES:
        if re.search(rx, t):
            return cat, False
    if ELECTRONIC_CRUMB_RE.search(crumb_txt) or ELECTRONIC_CRUMB_RE.search(url.lower()):
        return "other-electronics", False
    return None, False


# ---------------------------------------------------------------- attributes
COLOURS = (
    "black|white|silver|gold|grey|gray|space gray|space grey|blue|deep blue|navy|red|green|sage|pink|purple|lavender|"
    "yellow|orange|cosmic orange|titanium|natural|desert|teal|ultramarine|midnight|starlight|graphite|mint|icyblue|"
    "icy blue|jet black|blue shadow|silver shadow|coral|cream|beige|brown|bronze|rose gold|sky blue|light gold|"
    "cloud white|space black|mist blue|lavender|phantom black|onyx|obsidian|porcelain|hazel|peony|aloe"
)
COLOUR_RE = re.compile(rf"\b({COLOURS})\b")
CONDITION_RE = re.compile(r"\b(refurbished|renewed|pre-?owned|used|open box|demo|ex-?display|rental)\b")
BUNDLE_RE = re.compile(r"(\+\s*\w|\bbundle\b|\bwith (game|controller|voucher)|\bvoucher\b| fc ?2\d| \bgame\b.*\bedition\b)")
REGION_RE = re.compile(r"\b(international version|middle east version|ksa version|uae version|global version|us version|china version|japan version|hk version|indian version)\b")


def storage_of(t: str) -> str | None:
    """Largest storage figure that is not RAM. '256GB 12GB RAM' -> 256GB; '1 TB' -> 1TB."""
    vals = []
    for m in re.finditer(r"(\d{1,4})\s?(gb|tb)\b(\s*(ram|memory|lpddr|ddr|unified))?", t):
        if m.group(3):
            continue
        n = int(m.group(1)) * (1024 if m.group(2) == "tb" else 1)
        if n >= 16:  # storage is >=16GB; smaller values are RAM in phone titles
            vals.append(n)
    if not vals:
        return None
    n = max(vals)
    return f"{n // 1024}TB" if n >= 1024 and n % 1024 == 0 else f"{n}GB"


def ram_of(t: str) -> str | None:
    m = re.search(r"(\d{1,3})\s?gb\s*(ram|unified memory|memory|lpddr\w*|ddr\w*)", t)
    return f"{m.group(1)}GB" if m else None


def screen_of(t: str) -> str | None:
    m = re.search(r"(\d{2}(?:\.\d)?)\s?(?:-|\s)?(?:inch|in\b|\"|”|''|cm\b)", t)
    return m.group(1) if m else None


# ---------------------------------------------------------------- model families
def _family(t: str, brand: str | None, category: str | None) -> str | None:
    """Brand-specific model family without colour/storage. Returns None when unsure."""
    m = re.search(r"\biphone\s?(\d{2}|air|se)\s?(e)?\s?(pro max|pro|plus|mini)?\b", t)
    if m:
        return "apple iphone " + " ".join(x for x in (m.group(1), m.group(2), m.group(3)) if x).replace(" e", "e")
    m = re.search(r"\bipad\s?(pro|air|mini)?\s?(\d{1,2}(?:\.\d)?)?(?:\s?-?inch| in\b|\")?", t)
    if m and "ipad" in t:
        chip = re.search(r"\b(m[1-5]|a1[5-9])\b", t)
        gen = re.search(r"\b(\d{1,2})(?:st|nd|rd|th) gen", t)
        size = m.group(2) or screen_of(t)
        conn = "cellular" if re.search(r"cellular|5g|lte", t) else "wifi"
        parts = ["apple ipad", m.group(1) or "", size or "", chip.group(1) if chip else (f"gen{gen.group(1)}" if gen else ""), conn]
        return " ".join(p for p in parts if p)
    m = re.search(r"\bmacbook\s?(air|pro)\b", t)
    if m:
        chip = re.search(r"\b(m[1-5])(\s?(pro|max))?\b", t)
        size = screen_of(t) or (re.search(r"\b(13|14|15|16)\b", t) or [None, None])[1]
        ram = ram_of(t) or ""
        return " ".join(p for p in ["apple macbook", m.group(1), size or "", chip.group(0) if chip else "", ram.lower()] if p)
    m = re.search(r"\bairpods\s?(pro\s?\d?|max|\d)?(\s?(with )?(active noise cancell?ation|anc))?", t)
    if m and "airpods" in t:
        v = (m.group(1) or "").strip()
        gen = re.search(r"\b(\d)(?:st|nd|rd|th) gen", t)
        if v == "pro" and gen:
            v = f"pro {gen.group(1)}"
        anc = " anc" if m.group(2) else ""
        return f"apple airpods {v}{anc}".strip()
    m = re.search(r"\bapple watch\s?(series\s?\d+|ultra\s?\d?|se\s?\d?)", t) or re.search(r"\bwatch\s?(series\s?\d+|ultra\s?\d)", t)
    if m and brand == "apple":
        size = re.search(r"\b(\d{2})\s?mm\b", t)
        return f"apple watch {m.group(1).replace('  ', ' ')} {size.group(1) + 'mm' if size else ''}".strip()
    m = re.search(r"\bgalaxy\s?(z\s?fold\s?\d+|z\s?flip\s?\d+|s\d{2}|a\d{2}|m\d{2}|note\s?\d+|tab\s?s\d+|tab\s?a\d+|watch\s?\d+|buds\s?\d*)\s?(ultra|plus|\+|fe|edge|lite|pro|classic)?\b", t)
    if m:
        fam = re.sub(r"\s+", "", m.group(1)).replace("zfold", "z fold").replace("zflip", "z flip")
        return f"samsung galaxy {fam} {(m.group(2) or '').replace('+', 'plus')}".strip()
    if re.search(r"\b(ps5|playstation\s?5)\b", t) and category == "gaming-consoles":
        kind = "pro" if re.search(r"\bpro\b", t) else ("digital" if "digital" in t else "disc")
        return f"sony playstation 5 {kind}"
    m = re.search(r"\bxbox series\s?([xs])\b", t)
    if m and category == "gaming-consoles":
        return f"microsoft xbox series {m.group(1)}"
    m = re.search(r"\bnintendo switch\s?(2|oled|lite)?\b", t)
    if m and category == "gaming-consoles":
        return f"nintendo switch {m.group(1) or 'v2'}".strip()
    m = re.search(r"\bpixel\s?(\d+a?)\s?(pro xl|pro fold|pro|xl)?\b", t)
    if m:
        return f"google pixel {m.group(1)} {m.group(2) or ''}".strip()
    m = re.search(r"\b(wh|wf)-?\s?(1000x?m\d|ch\d{3}n?)\b", t)
    if m:
        return f"sony {m.group(1)}-{m.group(2).replace(' ', '')}"
    m = re.search(r"\bdualsense( edge)?\b", t)
    if m and category in ("gaming", "accessories", "gaming-consoles") and not re.search(r"console|charging|station|dock|stand|case|skin|cover|bundle|cable", t):
        return "sony dualsense" + (" edge" if m.group(1) else "")
    return None


LUXURY_RE = re.compile(r"\b(merlin craft|caviar|24k|gold plated|gold edition|custom edition|diamond edition|lamborghini edition)\b")
NOISE = re.compile(rf"\b(dual sim|single sim|esim|5g|4g|lte|smartphone|smart phone|mobile phone|phone|tablet|wi-?fi|cellular|"
                   rf"middle east version|international version|global version|ai|with|and|facetime|nfc|android|"
                   rf"{COLOURS})\b")


def _generic_family(t: str, brand: str) -> str | None:
    """Brand + model words up to the first storage/RAM figure: 'honor play 20a 4g 128gb ...' -> 'honor play 20a'."""
    m = re.search(rf"\b{re.escape(brand)}\b(.*?)(\d{{2,4}}\s?(gb|tb)\b|\(|,| - |$)", t)
    if not m:
        return None
    words = NOISE.sub(" ", m.group(1))
    words = re.sub(r"[^\w+ ]", " ", words)
    words = re.sub(r"\s+", " ", words).strip()
    if not words or len(words) < 2 or not re.search(r"\d|[a-z]{3,}", words):
        return None
    return f"{brand} {words}"[:60]


MODEL_CODE_RE = re.compile(r"\b(?=[a-z0-9-]*\d)(?=[a-z0-9-]*[a-z])[a-z0-9]+(?:-[a-z0-9]+)*\b")
STOP_CODES = re.compile(r"^(\d+(gb|tb|mm|mah|w|hz|k|p|mp|cm|ml|l)|\d+(st|nd|rd|th)|wifi6e?|usb-?c|5g|4g|lte|m\d|a\d{2}|ps\d|x\d|\d+x)$")


NOT_CODE = re.compile(r"^(\d+-in-\d+|20\d\d|insta360|wi-?fi-?\d\w*|usb-?c\d*|ddr\d\w*|lpddr\d\w*|rtx-?\d+\w*|gtx-?\d+|i[3579]-?\d+\w*|"
                      r"ryzen-?\d*|m\d-?(pro|max)?|\d+(hz|mah|mp|w|nm|gb|tb|mm|cm|kg|ml|fps|k)|hdr\d+|bt-?\d\w*|ip\d\d|qi\d?|a\d{2}-?pro)$")


def model_code(t: str, brand: str | None) -> str | None:
    """Manufacturer model codes like 'ue55du7000', 'sm-s938b', 'cfi-2000', '55qned86t6a'.
    Picks the LONGEST plausible code (the full SKU usually encodes size/variant), never brand names or spec tokens."""
    best = None
    for c in MODEL_CODE_RE.findall(t):
        if (len(c) >= 5 and not STOP_CODES.match(c) and not NOT_CODE.match(c) and not re.fullmatch(r"\d+", c)
                and sum(ch.isdigit() for ch in c) >= 2 and c not in BRANDS and (brand is None or c != brand.replace(" ", ""))):
            if best is None or len(c) > len(best):
                best = c
    return best


def identity(title: str, brand_field: str | None, crumbs: list[str] | None, url: str = "",
             gtin: str | None = None, mpn: str | None = None) -> dict:
    t = search_norm(title)
    category, is_acc = classify(title, crumbs, url)
    brand = detect_brand(brand_field, title)
    condition = (CONDITION_RE.search(t).group(1) if CONDITION_RE.search(t) else "new").replace("pre-owned", "used").replace("preowned", "used")
    bundle = bool(BUNDLE_RE.search(t)) and category in ("gaming-consoles", "phones", "laptops", "tablets")
    region_m = REGION_RE.search(t)
    colour_m = COLOUR_RE.search(t)
    storage = storage_of(t)
    fam = None if is_acc else _family(t, brand, category)
    # A different maker selling a customised device (e.g. "Merlin Craft iPhone", "Caviar") is not the stock device.
    bf = search_norm(brand_field or "")
    foreign = bool(bf) and BRAND_ALIASES.get(bf, bf) not in BRANDS and not re.match(r"^(apple|samsung|sony|google)", bf)
    if foreign or LUXURY_RE.search(t):
        fam = None
        brand = bf or brand
    if fam is None and not is_acc and category in ("phones", "tablets") and brand and not foreign:
        fam = _generic_family(t, brand)
    key = None
    method = None
    if fam:
        needs_storage = category in ("phones", "tablets", "laptops", "gaming-consoles") or fam.startswith(("apple iphone", "apple ipad", "samsung galaxy"))
        if needs_storage and fam.startswith(("apple iphone", "samsung galaxy s", "samsung galaxy z", "samsung galaxy a", "google pixel", "apple ipad", "apple macbook")) and not storage:
            fam = None  # can't safely merge a phone without knowing its storage
        else:
            key = fam + (f" {storage.lower()}" if storage and needs_storage else "")
            method = "family"
    if key is None:
        code = model_code(t, brand)
        if code and brand:
            key = f"{brand} {code}"
            method = "model_code"
    if key and bundle:
        key += " bundle"
    if key and condition != "new":
        key += f" {condition}"
    return {
        "category": category,
        "is_accessory": is_acc,
        "brand": brand,
        "family": fam,
        "storage": storage,
        "ram": ram_of(t),
        "colour": colour_m.group(1) if colour_m else None,
        "condition": condition,
        "region": region_m.group(1) if region_m else None,
        "bundle": bundle,
        "key": key,
        "match_method": method,
        "gtin": gtin,
        "mpn": mpn,
    }


def display_name(key: str | None, fallback_title: str) -> str:
    if not key:
        return fallback_title
    words = key.split()
    out = []
    for w in words:
        if re.fullmatch(r"\d+(gb|tb)", w):
            out.append(w.upper())
        elif w in ("iphone", "ipad", "macbook", "airpods"):
            out.append({"iphone": "iPhone", "ipad": "iPad", "macbook": "MacBook", "airpods": "AirPods"}[w])
        elif w in ("anc",):
            out.append("ANC")
        elif re.fullmatch(r"m\d( pro| max)?|a1\d", w):
            out.append(w.upper())
        elif "-" in w or re.search(r"\d", w) and re.search(r"[a-z]", w):
            out.append(w.upper())
        else:
            out.append(w.capitalize())
    s = " ".join(out)
    return s.replace("Wifi", "Wi-Fi").replace("Playstation", "PlayStation").replace("Dualsense", "DualSense").replace("Xbox", "Xbox")

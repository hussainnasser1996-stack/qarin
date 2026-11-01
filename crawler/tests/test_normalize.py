import pytest

from qarin.normalize import identity, search_norm, storage_of, display_name

K = lambda title, brand=None, crumbs=None: identity(title, brand, crumbs)["key"]


@pytest.mark.parametrize("a,b", [
    ("Apple iPhone 17 Pro Max (256GB) – Silver Middle East Version with FaceTime", "Apple iPhone 17 Pro Max, 5G, 6.9 inch 256GB, Deep Blue"),
    ("Apple iPhone 17 Pro (256GB) – Deep Blue Middle East Version", "Apple iPhone 17 Pro, 5G, 6.3 inch 256GB, Cosmic Orange"),
    ("Apple iPhone Air (256GB) – Sky Blue Middle East Version", "Apple iPhone Air,  5G, 6.5 inch 256GB, Cloud White"),
    ("Apple iPhone 16 128 GB Black", "Apple iPhone 16 128GB 8GB RAM 5G Smartphone Black 6.1inch MYDQ3AH/A"),
    ("Samsung Galaxy S25 Ultra 5G 256GB 12GB RAM Titanium Grey Dual Sim", "SAMSUNG Galaxy S25 Ultra, 5G, 256 GB, Titanium Gray"),
    ("Samsung Galaxy Z Fold7 5G 256GB 12GB RAM Blue Shadow AI Smartphone", "SAMSUNG Galaxy Z Fold 7, 5G, 256 GB, Silver Shadow"),
    ("Apple AirPods Pro 3 (2025)", "Apple AirPods Pro 3rd generation with ANC ,White"),
    ("Sony WH1000XM5/B Wireless Noise Cancelling Headphone Black", "Sony | WH-1000XM5 | Wireless Noise Cancelling Headphones"),
    ("Nintendo Switch 2 Gaming Console 256GB Black", "Nintendo Switch 2 Switch 2 256 GB  Black"),
])
def test_same_product(a, b):
    ka, kb = K(a), K(b)
    assert ka and ka == kb, (ka, kb)


@pytest.mark.parametrize("a,b", [
    ("Apple iPhone 17 Pro Max 256GB Silver", "Apple iPhone 17 Pro 256GB Silver"),
    ("Apple iPhone 17 Pro 256GB", "Apple iPhone 17 Pro 512GB"),
    ("Samsung Galaxy Z Fold7 5G 256GB", "Samsung Galaxy Z Fold7 5G 512GB"),
    ("Samsung Galaxy S25 5G 256GB Navy", "SAMSUNG Galaxy S25 Ultra, 5G, 256 GB"),
    ("Apple AirPods 4 with Active Noise Cancellation", "Apple Airpods 4 Type C Charging Port, White"),
])
def test_different_products(a, b):
    assert K(a) != K(b)


@pytest.mark.parametrize("title", [
    "Apple MagSafe Silicone Case Fuchsia iPhone 16 Plus",
    "Iphone 16 Pro Max Mobile Cover",
    "Uniq Hybrid Eleva iPhone 16 Pro Max MagSafe Stand Case – Black",
    "PodPocket Silicone Case for Apple Airpods, Dark Blue",
    "JBL FLIP 7 Waterproof Bluetooth Speaker Red",
    "Yakuza 0 Director's Cut for Nintendo Switch 2, Physical",
])
def test_traps_never_become_devices(title):
    k = K(title)
    assert not (k or "").startswith(("apple iphone", "apple airpods", "samsung galaxy z flip", "nintendo switch")), k


def test_bundle_and_condition_are_separate():
    assert K("Sony PS5 Slim Disc Home Console 1TB White – International Version + FC27 Game") != K("Sony PlayStation 5 Slim Disc Console 1TB")
    assert K("Apple iPhone 15 128GB Black Renewed") != K("Apple iPhone 15 128GB Black")


def test_storage_ignores_ram():
    assert storage_of(search_norm("Galaxy S25 Ultra 256GB 12GB RAM")) == "256GB"
    assert storage_of(search_norm("PS5 Pro 2 TB")) == "2TB"


def test_arabic_search_norm():
    assert search_norm("آيفون ١٧ برو") == "ايفون 17 برو"
    assert search_norm("سمّاعة") == "سماعه"


def test_display_name():
    assert display_name("apple iphone 17 pro max 256gb", "") == "Apple iPhone 17 Pro Max 256GB"


def test_custom_luxury_device_is_not_stock():
    assert K("Merlin Craft iPhone 18 Pro Max (512GB) – Alligator Brown", "Merlin Craft") != K("Apple iPhone 18 Pro Max 5G Smartphone, 512 GB Storage, Glacier", "Apple")


def test_generic_phone_family_merges_colours():
    a = K("Honor Play 20A 4G 128GB 4GB RAM Black Dual Sim Smartphone", "Honor")
    b = K("Honor Play 20A 4G 128GB 4GB RAM Blue Dual Sim Smartphone", "Honor")
    assert a and a == b and "128gb" in a


def test_tripod_is_accessory():
    assert identity("Hama FlexPro tripod for smartphones", "Hama", None)["category"] == "accessories"


def test_tv_sizes_not_merged():
    assert K("LG 55-inch QNED86 4K Smart TV 2024 | 55QNED86T6A", "LG") != K("LG 65-inch QNED86 4K Smart TV 2024 | 65QNED86T6A", "LG")


def test_rental_is_separate():
    assert K("[RENTAL] LG 65 inch UHD 4K Smart TV | 65UT80006LA-1-Day", "LG") != K("LG inch 65 UHD 4K Smart TV | 65UT80006LA", "LG")


def test_ps5_accessories_are_not_consoles():
    for t in ["Sony PlayStation 5 Dualsense Wireless Gaming Controller", "Sony 1080P HD Camera for PlayStation 5 White and Black",
              "Sony Disc Drive for PlayStation 5 Digital Edition Console", "PlayStation 5 Portal (CFIY1016Y-R)"]:
        assert identity(t, "Sony", None)["category"] != "gaming-consoles", t
    assert identity("Sony PlayStation 5 Slim Digital Edition Console", "Sony", None)["category"] == "gaming-consoles"


def test_2in1_is_not_a_model_code():
    a = K("HP OmniBook 5 Flip 2-in-1 Convertible (2026) Laptop – 3rd Series", "HP")
    b = K("HP OmniBook X Flip 2-in-1 Convertible (2026) Laptop", "HP")
    assert a is None or a != b


def test_model_code_ignores_hyphens():
    assert K("Sony MDR-EX15AP In-Ear Headphone Black", "Sony") == K("Sony MDREX15AP In Ear Headphone Black", "Sony")


def test_spec_tokens_never_become_codes():
    for a, b in [("SanDisk Extreme PRO SDXC UHS-I Memory Card 256GB", "SanDisk Extreme microSDXC UHS-I Card 256GB"),
                 ("Belkin Power Bank 20000mAh Black BPB012BTBK", "Belkin UltraCharge Power Bank 20000mAh Black")]:
        ka, kb = K(a, a.split()[0]), K(b, b.split()[0])
        assert ka is None or ka != kb, (ka, kb)


def test_galaxy_buds_models_stay_apart():
    k = lambda t: identity(t, "Samsung", None)["key"]
    assert k("Samsung Galaxy Buds Core Lite, White") == k("Samsung Galaxy Buds Core True Wireless Earbuds, Black – SM-R410NZKAMEA")
    assert k("Samsung Galaxy Buds Core Lite, White") != k("Samsung Galaxy Buds Live Earbuds Bluetooth Mystic Black")
    assert k("Samsung Galaxy Buds3 Pro Silver") == k("Samsung Galaxy Buds 3 Pro")


def test_model_suffix_plus_is_not_a_bundle():
    i = identity("Samsung Galaxy Tab A11+ WiFi 256GB", "Samsung", None)
    assert not i["bundle"] and display_name(i["key"], "") == "Samsung Galaxy Tab A11+ 256GB"
    assert identity("PS5 Console Slim Disc + 2 Controllers", "Sony", None)["bundle"]


def test_dualsense_edge_separate():
    a = identity("DualSense Edge™Wireless Controller,Midnight Black", "Sony", None)["key"]
    b = identity("Sony DualSense Controller Wireless White", "Sony", None)["key"]
    assert a != b


@pytest.mark.parametrize("title,cat", [
    ("Roco Notebook 18.5 X 25.5 cm", None),
    ("Asus Vivobook 15 Notebook, 16 GB RAM", "laptops"),
    ("Epson L3250 A4 printer", "printers"),
    ("PS5 Console with controller", "gaming-consoles"),
    ("Nintendo Switch 2 Pro Controller", "gaming"),
    ("Samsung Galaxy S25 smartphone case", "accessories"),
    ("Lenovo Tab M11 4GB 128GB", "tablets"),
])
def test_classify_edge_cases(title, cat):
    from qarin.normalize import classify
    assert classify(title, None, "")[0] == cat


def test_tv_size_and_cartridge_keys():
    a = identity("LG 55″ QNED AI QNED82 4K Smart TV", "LG", None)["key"]
    b = identity("LG 65″ QNED AI QNED82 4K Smart TV", "LG", None)["key"]
    assert a and b and a != b
    p = identity("Brother MFC-L3720CDW Color Laser Printer", "Brother", None)["key"]
    c = identity("TN279M--Brother MFC-L3720CDW Cartridge Magenta", "Brother", None)["key"]
    assert p != c
    assert identity('Lenovo Laptop 14" Intel Core i5-13420H (13th Gen)', "Lenovo", None)["key"] is None

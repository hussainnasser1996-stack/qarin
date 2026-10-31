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

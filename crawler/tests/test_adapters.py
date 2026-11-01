"""Parser checks against saved store pages (fixtures are local-only, not committed)."""
from pathlib import Path

import pytest

from qarin.adapters import parse

FX = Path(__file__).parent / "fixtures"
EXPECT = {  # store -> (currency, has_price)
    "sharafdg-bh": ("BHD", True), "sharafdg-om": ("OMR", True), "extra-bh": ("BHD", True), "extra-sa": ("SAR", True),
    "extra-om": ("OMR", True), "jarir-bh": ("BHD", True), "jarir-sa": ("SAR", True), "jarir-kw": ("KWD", True),
    "jarir-qa": ("QAR", True), "jumbo-ae": ("AED", True), "almanea-sa": ("SAR", True), "saco-sa": ("SAR", True),
    "xcite-kw": ("KWD", True), "jumbosouq-qa": ("QAR", True), "ansar-qa": ("QAR", True), "ashrafs-bh": ("BHD", True),
}


@pytest.mark.parametrize("store,exp", EXPECT.items())
def test_parse(store, exp):
    f = FX / f"{store}.html"
    if not f.exists():
        pytest.skip("fixture not present")
    p = parse(f.read_text(), "https://example/")
    assert p and p["title"]
    assert p["currency"] == exp[0]
    assert (p["price"] is not None) == exp[1]


def test_category_page_is_not_a_product():
    f = FX / "alsaif-sa.html"
    if not f.exists():
        pytest.skip("fixture not present")
    assert parse(f.read_text()) is None


def test_out_of_stock_without_price():
    f = FX / "sharafdg-ae.html"
    if not f.exists():
        pytest.skip("fixture not present")
    p = parse(f.read_text())
    assert p["in_stock"] is False and p["price"] is None


import os
import pytest as _pytest
from qarin.adapters import warranty_of


@_pytest.mark.parametrize("html,expected", [
    ('{"warranty":{"@type":"WarrantyPromise","durationOfWarranty":"P1Y"}}', (12, "store")),
    ('{"yearOfWarranty":"2","warranty":"2"}', (24, "manufacturer")),
    ('<div> 24 months  warranty by  JARIR     <div class="x">', (24, "store")),
    ('<div> 12 months  warranty by  Agent     <div class="x">', (12, "agent")),
    ('<span class="a"> FREE - 1 Year Manufacturer Warranty</span>', (12, "manufacturer")),
    ('<footer>We offer extended warranty plans. Not covered as part of the manufacturer warranty</footer>', (None, None)),
    ('<p>All products carry warranty, visible on the invoice</p>', (None, None)),
])
def test_warranty_formats(html, expected):
    assert warranty_of(html) == expected


@_pytest.mark.parametrize("store,expected", [
    ("extra-sa", (24, "manufacturer")), ("jarir-sa", (24, "store")), ("sharafdg-bh", (12, "manufacturer")),
    ("jumbosouq-qa", (12, "store")), ("ourshopee-bh", (12, "seller")), ("lulu-ae", (12, "manufacturer")),
    ("xcite-kw", (None, None)), ("ansar-qa", (None, None)),
])
def test_warranty_real_pages(store, expected):
    f = os.path.join(os.path.dirname(__file__), "fixtures", "w", f"{store}.html")
    if not os.path.exists(f):
        _pytest.skip("fixture not saved on this machine")
    assert warranty_of(open(f).read()) == expected

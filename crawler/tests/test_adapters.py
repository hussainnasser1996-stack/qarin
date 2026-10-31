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

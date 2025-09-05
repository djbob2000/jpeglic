from pathlib import Path
from unittest.mock import patch

import pytest

from data.items import Items

@pytest.fixture
def items():
    items = Items()
    return items

def test_parseData_valid(items):
    items.parseData(
        "Original",
        (Path("images/1/image.jpg"), Path("images/1")),
        (Path("images/1/image 2.jpg"), Path("images/1")),
    )
    assert items.getItemCount() == 2
    assert (Path("images/1/image.jpg"), Path("images/1")) in items.items
    assert (Path("images/1/image 2.jpg"), Path("images/1")) in items.items

def test_parseData_partially_valid(items):
    items.parseData(
        "Original",
        (Path("images/1/image.jpg"), "images/1"),
        (Path("images/1/image 2.jpg"), Path("images/1")),
    )
    assert items.getItemCount() == 1
    assert items.getItem(0) == (Path("images/1/image 2.jpg"), Path("images/1"))

def test_parseData_invalid(items, caplog):
    items.parseData("Original", (Path("images/1/image.exr"), Path("images/1")))
    assert caplog.records[0].message == "[Items] Extension not allowed (exr)"
    items.parseData("Original", (Path("images/1/image.jpg"), "images/1"))
    assert caplog.records[1].message == "[Items] anchor_path is not a Path object (<class 'str'>)"

def test_parseData_order_random(items):
    with patch("data.items.random.shuffle") as mock_shuffle:
        items.parseData("Random", (Path("images/1/image.jpg"), Path("images/1")),)
        mock_shuffle.assert_called_once_with(items.items)

def test_parseData_order_sequential(items):
    items.parseData(
        "Sequential",
        (Path("bdir/2.jpg"), Path("bdir")),
        (Path("adir/0.jpg"), Path("adir")),
        (Path("bdir/1.jpg"), Path("bdir")),
    )
    assert items.items == [
        (Path("adir/0.jpg"), Path("adir")),
        (Path("bdir/1.jpg"), Path("bdir")),
        (Path("bdir/2.jpg"), Path("bdir")),
    ]

def test_parseData_order_original(items):
    items.parseData(
        "Original",
        (Path("bdir/2.jpg"), Path("bdir")),
        (Path("adir/0.jpg"), Path("adir")),
        (Path("bdir/1.jpg"), Path("bdir")),
    )
    assert items.items == [
        (Path("bdir/2.jpg"), Path("bdir")),
        (Path("adir/0.jpg"), Path("adir")),
        (Path("bdir/1.jpg"), Path("bdir")),
    ]

def test_clear(items):
    assert items.items == []
    assert items.completed_item_count == 0
    assert items.item_count == 0

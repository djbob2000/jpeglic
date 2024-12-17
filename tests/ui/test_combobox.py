import os

import pytest
from PySide6.QtWidgets import QApplication

from ui.combobox import ComboBox

@pytest.fixture
def combo_box(app):
    return ComboBox()

def test_showPopup_empty(combo_box):
    combo_box.showPopup()
    assert combo_box.count() == 0

def test_showPopup_populated(combo_box):
    combo_box.addItems((f"item {i}" for i in range(0, 10)))
    combo_box.showPopup()
    assert combo_box.count() == 10
    assert combo_box.view() is not None
    assert combo_box.view().minimumHeight() > 0

def test_constructor_no_items(app):
    cmb = ComboBox()
    assert cmb.count() == 0

def test_constructor_add_items(app):
    items = ("item0", "item1", "item2")
    cmb = ComboBox(items)
    assert cmb.count() == len(items)
    for i in range(cmb.count()):
        assert cmb.itemText(i) == items[i]
import os

import pytest
from PySide6.QtWidgets import QApplication

from ui.combobox import ComboBox

@pytest.fixture(scope="session")
def app():
    os.environ["QT_QPA_PLATFORM"] = "offscreen" # Headless
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    yield app
    app.quit()

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

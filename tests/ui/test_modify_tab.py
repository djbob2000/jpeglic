from unittest.mock import patch

import pytest
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt

from ui.modify_tab import ModifyTab

@pytest.fixture
def app(qtbot):
    with patch("ui.modify_tab.WidgetManager.loadState"), \
        patch("ui.modify_tab.WidgetManager.saveState"):
        app = QApplication.instance()
        if not app:
            app = QApplication([])
        tab = ModifyTab({
            "disable_downscaling_startup": False,
            "custom_resampling": False,
        })
        qtbot.addWidget(tab)
        return tab

def test_init(app):
    assert app.resample_l.isVisibleTo(app) == False
    assert app.resample_cmb.isVisibleTo(app) == False

@pytest.mark.parametrize("enabled", [
    False, True,
])
def test_toggleDownscaleUI(enabled, app):
    app.toggleDownscaleUI(enabled)
    assert app.percent_l.isEnabled() == enabled
    assert app.percent_sb.isEnabled() == enabled
    assert app.pixel_h_l.isEnabled() == enabled
    assert app.pixel_h_sb.isEnabled() == enabled
    assert app.pixel_w_l.isEnabled() == enabled
    assert app.pixel_w_sb.isEnabled() == enabled
    assert app.file_size_l.isEnabled() == enabled
    assert app.file_size_sb.isEnabled() == enabled
    assert app.shortest_l.isEnabled() == enabled
    assert app.shortest_sb.isEnabled() == enabled
    assert app.longest_l.isEnabled() == enabled
    assert app.longest_sb.isEnabled() == enabled
    assert app.megapixels_sb.isEnabled() == enabled
    assert app.megapixels_l.isEnabled() == enabled

def test_resetToDefault(app):
    app.downscale_cb.setChecked(True)
    app.metadata_cmb.setCurrentIndex(1)
    app.date_time_cb.setChecked(True)
    app.mode_cmb.setCurrentIndex(1)
    app.resample_cmb.setCurrentIndex(1)
    app.file_size_sb.setValue(400)
    app.percent_sb.setValue(81)
    app.pixel_w_sb.setValue(1000)
    app.pixel_h_sb.setValue(1000)
    app.shortest_sb.setValue(5000)
    app.longest_sb.setValue(5000)

    app.resetToDefault()

    assert app.downscale_cb.isChecked() == False
    assert app.resample_cmb.currentIndex() == 0
    assert app.metadata_cmb.currentIndex() == 0
    assert app.date_time_cb.isChecked() == False
    assert app.mode_cmb.currentIndex() == 0
    assert app.resample_cmb.currentIndex() == 0
    assert app.file_size_sb.value() == 300
    assert app.percent_sb.value() == 80
    assert app.pixel_w_sb.value() == 2000
    assert app.pixel_h_sb.value() == 2000
    assert app.shortest_sb.value() == 1080
    assert app.longest_sb.value() == 1920
    assert app.megapixels_sb.value() == 2.1

def test_getSettings_key_error(app):
    app.getSettings()

@pytest.mark.parametrize("mode_title", [
    ("Percent"),
    ("Resolution"),
    ("File Size"),
    ("Shortest Side"),
    ("Longest Side"),
    ("Megapixels"),
])
def test_onModeChanged_visibility(mode_title, app):
    app.mode_cmb.setCurrentIndex(app.mode_cmb.findText(mode_title))
    assert app.percent_l.isVisibleTo(app) == (mode_title == "Percent")
    assert app.percent_sb.isVisibleTo(app) == (mode_title == "Percent")
    assert app.pixel_h_l.isVisibleTo(app) == (mode_title == "Resolution")
    assert app.pixel_h_sb.isVisibleTo(app) == (mode_title == "Resolution")
    assert app.pixel_w_l.isVisibleTo(app) == (mode_title == "Resolution")
    assert app.pixel_w_sb.isVisibleTo(app) == (mode_title == "Resolution")
    assert app.file_size_l.isVisibleTo(app) == (mode_title == "File Size")
    assert app.file_size_sb.isVisibleTo(app) == (mode_title == "File Size")
    assert app.shortest_l.isVisibleTo(app) == (mode_title == "Shortest Side")
    assert app.shortest_sb.isVisibleTo(app) == (mode_title == "Shortest Side")
    assert app.longest_l.isVisibleTo(app) == (mode_title == "Longest Side")
    assert app.longest_sb.isVisibleTo(app) == (mode_title == "Longest Side")
    assert app.megapixels_sb.isVisibleTo(app) == (mode_title == "Megapixels")
    assert app.megapixels_l.isVisibleTo(app) == (mode_title == "Megapixels")

def test_getResampling_disabled(app):
    app.toggleCustomResampling(False)
    app.resample_cmb.setCurrentIndex(1)
    assert app.getResampling() == "Default"

def test_getResampling_enabled(app):
    app.toggleCustomResampling(True)
    app.resample_cmb.setCurrentIndex(1)
    assert app.getResampling() != "Default"

@pytest.mark.parametrize("custom_resampling_enabled", [True, False])
def test_toggleCustomResampling(custom_resampling_enabled, app):
    app.toggleCustomResampling(custom_resampling_enabled)

    assert app.resample_visible == custom_resampling_enabled
    assert app.resample_cmb.isVisibleTo(app) == custom_resampling_enabled
    assert app.resample_l.isVisibleTo(app) == custom_resampling_enabled
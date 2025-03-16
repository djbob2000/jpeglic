from unittest.mock import patch

import pytest
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt

from ui.tabs.modify_tab import ModifyTab

@pytest.fixture
def app(qtbot):
    with (
        patch("ui.tabs.modify_tab.WidgetManager.loadState"),
        patch("ui.tabs.modify_tab.WidgetManager.saveState"),
    ):
        tab = ModifyTab(
            {
                "disable_downscaling_startup": False,
                "custom_resampling": False,
            },
            {
                "format": "JPEG XL"
            }
        )
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
    if not enabled:
        assert app.pixel_h_cb.isEnabled() == enabled
        assert app.pixel_w_cb.isEnabled() == enabled
        assert app.pixel_h_sb.isEnabled() == enabled
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
    app.pixel_w_cb.setChecked(False)
    app.pixel_h_cb.setChecked(False)

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
    assert app.pixel_w_cb.isChecked() == True
    assert app.pixel_h_cb.isChecked() == True

def test__returnDownscalingEnabled_disabled(app):
    app.downscale_cb.setChecked(False)
    assert not app._returnDownscalingEnabled()

def test__returnDownscalingEnabled_resolution_options_disabled(app):
    app.mode_cmb.setCurrentText("Resolution")
    app.pixel_w_cb.setChecked(False)
    app.pixel_h_cb.setChecked(False)

    assert not app._returnDownscalingEnabled()

def test__returnDownscalingEnabled_disabled(app):
    app.mode_cmb.setCurrentText("Resolution")
    app.pixel_w_cb.setChecked(True)
    app.downscale_cb.setChecked(True)

    assert app._returnDownscalingEnabled()

def test_getSettings_no_key_error(app):
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
    app.mode_cmb.setCurrentText(mode_title)
    assert app.pixel_h_cb.isVisibleTo(app) == (mode_title == "Resolution")
    assert app.pixel_h_sb.isVisibleTo(app) == (mode_title == "Resolution")
    assert app.pixel_w_cb.isVisibleTo(app) == (mode_title == "Resolution")
    assert app.pixel_w_sb.isVisibleTo(app) == (mode_title == "Resolution")
    assert app.percent_l.isVisibleTo(app) == (mode_title == "Percent")
    assert app.percent_sb.isVisibleTo(app) == (mode_title == "Percent")
    assert app.file_size_l.isVisibleTo(app) == (mode_title == "File Size")
    assert app.file_size_sb.isVisibleTo(app) == (mode_title == "File Size")
    assert app.shortest_l.isVisibleTo(app) == (mode_title == "Shortest Side")
    assert app.shortest_sb.isVisibleTo(app) == (mode_title == "Shortest Side")
    assert app.longest_l.isVisibleTo(app) == (mode_title == "Longest Side")
    assert app.longest_sb.isVisibleTo(app) == (mode_title == "Longest Side")
    assert app.megapixels_sb.isVisibleTo(app) == (mode_title == "Megapixels")
    assert app.megapixels_l.isVisibleTo(app) == (mode_title == "Megapixels")

def test_onFileFormatChanged(app):
    file_format = "JPEG XL"
    app.file_format = None

    with (
        patch.object(app, "_updateFileFormat") as mock__updateFileFormat,
    ):
        app.onFileFormatChanged(file_format)

        mock__updateFileFormat.assert_called_once()
        assert app.file_format == file_format

@pytest.mark.parametrize("file_format, enabled", [
    ("JPEG XL", True),
    ("JPEG Reconstruction", False),
    ("Lossless JPEG Transcoding", False),
])
def test__updateFileFormat(file_format, enabled, app):
    app.file_format = file_format

    with (
        patch.object(app.metadata_cmb, "setEnabled") as mock_metadata_cmb_setEnabled,
        patch.object(app.metadata_l, "setEnabled") as mock_metadata_l_setEnabled,
    ):
        app._updateFileFormat()

        mock_metadata_cmb_setEnabled.assert_called_once_with(enabled)
        mock_metadata_l_setEnabled.assert_called_once_with(enabled)

@pytest.mark.parametrize("downscaling_cb, width_cb, height_cb, expected_width_sb_enabled, expected_height_sb_enabled", [
    (True, True, True, True, True),
    (False, False, False, False, False),
    (False, True, True, False, False),
    (True, True, False, True, False),
    (True, False, True, False, True),
    (True, False, False, False, False),
])
def test_resolution_checkboxes_interactions(downscaling_cb, width_cb, height_cb, expected_width_sb_enabled, expected_height_sb_enabled, app):
    app.downscale_cb.setChecked(downscaling_cb)
    app.pixel_w_cb.setChecked(width_cb)
    app.pixel_h_cb.setChecked(height_cb)
    assert app.pixel_w_sb.isEnabled() == expected_width_sb_enabled
    assert app.pixel_h_sb.isEnabled() == expected_height_sb_enabled
    
def test_resolution_checkboxes_resetToDefault(app):
    app.downscale_cb.setChecked(True)
    app.resetToDefault()
    assert not app.pixel_w_sb.isEnabled()
    assert not app.pixel_h_sb.isEnabled()
    
    app.pixel_w_cb.setChecked(False)
    app.pixel_h_cb.setChecked(False)
    app.downscale_cb.setChecked(False)
    app.resetToDefault()
    assert not app.pixel_w_sb.isEnabled()
    assert not app.pixel_h_sb.isEnabled()

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
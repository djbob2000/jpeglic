from unittest.mock import patch, call
from contextlib import ExitStack
import logging

import pytest
from PySide6.QtWidgets import QApplication, QCheckBox, QComboBox
from PySide6.QtCore import Qt

from ui.settings_tab import SettingsTab

@pytest.fixture
def app(qtbot):
    with patch("ui.settings_tab.WidgetManager.loadState"), \
        patch("ui.settings_tab.WidgetManager.saveState"), \
        patch("ui.settings_tab.setTheme"):
        tab = SettingsTab()
        qtbot.addWidget(tab)
        return tab

@pytest.mark.parametrize("category", ["general", "conversion", "advanced"])
def test_changeCategory_visibility(category, app, qtbot):
    visibility = {
        "general": [
            "disable_on_startup_l", "disable_downscaling_startup_cb", "disable_delete_startup_cb",
            "no_sorting_cb",
            "quality_prec_snap_cb",
            "play_sound_on_finish_cb", "play_sound_on_finish_vol_l", "play_sound_on_finish_vol_sb",
        ],
        "conversion": [
            "jxl_lossy_modular_cb",
            "jxl_lossless_jpeg_cb",
            "jpg_encoder_l", "jpg_encoder_cmb",
            "avif_encoder_l", "avif_encoder_cmb",
            "avif_bit_depth_l", "avif_bit_depth_cmb",
            "disable_progressive_jpegli_cb",
            "keep_if_larger_cb",
            "copy_if_larger_cb",
        ],
        "advanced": [
            "ram_optimizer_l", "ram_optimizer_cmb",
            "ram_optimizer_rules_l", "ram_optimizer_rules_te",
            "ram_optimizer_rules_reset_btn",
            "no_exceptions_cb",
            "jxl_int_effort_cb",
            "jxl_effort_10_cb",
            "custom_resampling_cb",
            "exiftool_l",
            "exiftool_reset_btn",
            "exiftool_wipe_l", "exiftool_wipe_te",
            "exiftool_preserve_l", "exiftool_preserve_te",
            "exiftool_unsafe_wipe_l", "exiftool_unsafe_wipe_te",
            "exiftool_custom_l", "exiftool_custom_te",
            "custom_args_cb",
            "avifenc_args_l", "avifenc_args_te",
            "cjxl_args_l", "cjxl_args_te",
            "cjpegli_args_l", "cjpegli_args_te",
            "im_args_l", "im_args_te",
            "start_logging_btn", "open_log_dir_btn", "wipe_log_dir_btn",
        ],
    }

    tracked_widgets = [widget for widgets in visibility.values() for widget in widgets]

    qtbot.mouseClick(getattr(app, category + "_btn"), Qt.LeftButton)
    for widget_str in tracked_widgets:
        widget_p = getattr(app, widget_str, None)
        if widget_p is None:
            assert False, f"Widget not found ({widget_str})"
        assert widget_p.isVisibleTo(app) == ( widget_str in visibility[category] ), \
            f"Expected {widget_str in visibility[category]} got {widget_p.isVisibleTo(app)} ({widget_str})"

@pytest.mark.parametrize("signal_attr, widget_attr", [
    ("custom_resampling_toggled", "custom_resampling_cb"),
    ("sorting_toggled", "no_sorting_cb"),
    ("jxl_effort_10_toggled", "jxl_effort_10_cb"),
    ("avif_encoder_changed", "avif_encoder_cmb"),
])
def test_signals(signal_attr, widget_attr, qtbot, app):
    with qtbot.waitSignal(getattr(app.signals, signal_attr), timeout=1000) as blocker:
        widget = getattr(app, widget_attr, None)
        if widget is None:
            pytest.fail(f"Widget does not exist ({widget_attr})")
        if isinstance(widget, QCheckBox):
            widget.setChecked(not widget.isChecked())
        elif isinstance(widget, QComboBox):
            widget.setCurrentIndex((widget.currentIndex() - 1) % widget.count())
    assert blocker.signal_triggered

@pytest.fixture
def onAVIFBitDepthChanged_patches(app):
    patches = {
        "avif_encoder_cmb.currentText": patch.object(app.avif_encoder_cmb, "currentText"),
        "avif_bit_depth_cmb.currentText": patch.object(app.avif_bit_depth_cmb, "currentText"),
        "wm.getVar": patch.object(app.wm, "getVar", return_value="8"),
        "avif_bit_depth_cmb.setCurrentText": patch.object(app.avif_bit_depth_cmb, "setCurrentText"),
        "avif_bit_depth_cmb.clear": patch.object(app.avif_bit_depth_cmb, "clear"),
        "blockSignals": patch("ui.settings_tab.blockSignals"),
    }

    with ExitStack() as stack:
        _mocks = {name: stack.enter_context(patcher) for name, patcher in patches.items()}
        yield app, _mocks

@pytest.mark.parametrize("encoder, var_name", [
    ("AOM AV1", "aom_av1_bit_depth"),
    ("SVT-AV1-PSY", "svt_av1_psy_bit_depth"),
])
def test_onAVIFBitDepthChanged_happy_path(encoder, var_name, onAVIFBitDepthChanged_patches):
    app, mocks = onAVIFBitDepthChanged_patches
    mocks["avif_encoder_cmb.currentText"].return_value = encoder
    mocks["avif_bit_depth_cmb.currentText"].return_value = var_name

    app.onAVIFEncoderChanged()

    mocks["blockSignals"].assert_called_once_with(app.avif_bit_depth_cmb)
    mocks["avif_bit_depth_cmb.clear"].assert_called_once()
    mocks["wm.getVar"].assert_called_once_with(var_name)
    mocks["avif_bit_depth_cmb.setCurrentText"].assert_called_once_with(mocks["wm.getVar"].return_value)

def test_onAVIFBitDepthChanged_unknown_encoder(caplog, onAVIFBitDepthChanged_patches):
    app, mocks = onAVIFBitDepthChanged_patches
    mocks["avif_encoder_cmb.currentText"].return_value = "new_enc"
    caplog.set_level(logging.ERROR)

    app.onAVIFEncoderChanged()

    caplog.records[0].message = "Unknown encoder"
    mocks["wm.getVar"].assert_not_called()

def test_onAVIFBitDepthChanged_var_not_found(onAVIFBitDepthChanged_patches):
    app, mocks = onAVIFBitDepthChanged_patches
    mocks["wm.getVar"].return_value = None
    mocks["avif_encoder_cmb.currentText"].return_value = "AOM AV1"

    app.onAVIFEncoderChanged()

    mocks["avif_bit_depth_cmb.setCurrentText"].assert_called_once_with("Auto")

def test_onThemeChanged(app):
    with (
        patch.object(app.theme_cmb, "currentText", return_value="theme") as mock_currentText,
        patch("ui.settings_tab.setTheme") as mock_setTheme,
    ):
        app.onThemeChanged()
        mock_setTheme.assert_called_once_with(mock_currentText.return_value)

def test_getSettings_no_key_error(app):
    app.getSettings()

def test_resetToDefault(app):
    app.resetToDefault()

    assert app.no_sorting_cb.isChecked() == False
    assert app.disable_downscaling_startup_cb.isChecked() == True
    assert app.disable_delete_startup_cb.isChecked() == True
    assert app.no_exceptions_cb.isChecked() == False
    
    assert app.jxl_effort_10_cb.isChecked() == False
    assert app.jxl_lossy_modular_cb.isChecked() == False
    assert app.custom_resampling_cb.isChecked() == False
    assert app.disable_progressive_jpegli_cb.isChecked() == False

    assert app.jxl_int_effort_cb.isChecked() == False
    assert app.custom_args_cb.isChecked() == False
    assert app.cjxl_args_te.toPlainText() == ""
    assert app.cjpegli_args_te.toPlainText() == ""
    assert app.im_args_te.toPlainText() == ""
    assert app.avifenc_args_te.toPlainText() == ""
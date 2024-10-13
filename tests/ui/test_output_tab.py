from unittest.mock import patch, ANY, MagicMock

import pytest
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt, QDir

from ui.output_tab import OutputTab

@pytest.fixture
def app(qtbot):
    with patch("ui.output_tab.WidgetManager.loadState"), \
        patch("ui.output_tab.WidgetManager.saveState"):
        app = QApplication.instance()
        if not app:
            app = QApplication([])
        tab = OutputTab(
            4,
            {
                "disable_delete_startup": False,
                "enable_jxl_effort_10": False,
                "enable_quality_precision_snapping": False,
                "jpg_encoder": "JPEGLI",
            }
        )
        qtbot.addWidget(tab)
        return tab

def test_initial_state(app):
    # Format
    settings = app.getSettings()
    assert settings["format"] == "JPEG XL"
    assert settings["quality"] == 80
    assert settings["lossless"] == False
    assert settings["max_compression"] == False
    assert settings["effort"] == 7
    assert settings["intelligent_effort"] == False
    assert settings["jxl_modular"] == False
    assert settings["jxl_png_fallback"] == True
    assert settings["delete_original"] == False
    assert not app.smIsFormatPoolEmpty()

    # Conv.
    assert settings["if_file_exists"] == "Rename"
    assert app.getUsedThreadCount() == 3
    
    # After conv.
    assert not app.isClearAfterConvChecked()
    assert settings["delete_original_mode"] == "To Trash"

    # Save To
    assert settings["custom_output_dir"] == False
    assert settings["custom_output_dir_path"] == ""
    assert settings["keep_dir_struct"] == False

def test_thread_slider_change(app, qtbot):
    qtbot.mouseClick(app.threads_sl, Qt.LeftButton, pos=app.threads_sl.rect().center())
    assert app.threads_sb.value() == app.threads_sl.value()

def test_thread_spinbox_change(app):
    app.threads_sb.setValue(2)
    assert app.threads_sb.value() == 2
    assert app.threads_sb.value() == app.threads_sl.value()

def test_thread_slider_change(app):
    app.quality_sl.setValue(50)
    assert app.quality_sl.value() == 50
    assert app.quality_sl.value() == app.quality_sb.value()

def test_thread_spinbox_change(app):
    app.quality_sb.setValue(50)
    assert app.quality_sb.value() == 50
    assert app.quality_sl.value() == app.quality_sb.value()

def test_deleteOriginal_change(app):
    app.delete_original_cb.setChecked(True)
    assert app.delete_original_cmb.isEnabled()

def test_output_toggled(app):
    app.choose_output_ct_rb.setChecked(True)
    assert app.choose_output_ct_le.isEnabled()
    assert app.choose_output_ct_btn.isEnabled()
    
    app.choose_output_src_rb.setChecked(True)
    assert not app.choose_output_ct_le.isEnabled()
    assert not app.choose_output_ct_btn.isEnabled()

def test_onFormatChange_int_e_toggle(app):
    app.format_cmb.setCurrentIndex(app.format_cmb.findText("JPEG XL"))
    app.int_effort_cb.setChecked(True)

    assert not app.effort_sb.isEnabled()

def test_onFormatChange_lossless_toggled(app):
    app.lossless_cb.setChecked(True)
    
    assert app.lossless_cb.isEnabled()
    assert not app.quality_sl.isEnabled()
    assert not app.quality_sb.isEnabled()
    
    app.lossless_cb.setChecked(False)
    
    assert app.lossless_cb.isEnabled()
    assert app.quality_sl.isEnabled()
    assert app.quality_sb.isEnabled()

@pytest.mark.parametrize("file_format, visible_widgets", [
    ("JPEG XL", ["quality", "int_effort", "effort", "lossless", "jxl_modular"]),
    ("AVIF", ["quality", "effort", "chroma_subsampling"]),
    ("WebP", ["quality", "effort", "lossless"]),
    ("JPEG", ["quality", "chroma_subsampling"]),
    ("PNG", []),
    ("Lossless JPEG Transcoding", ["effort"]),
    ("JPEG Reconstruction", ["png_fallback"]),
    ("Smallest Lossless", ["smallest_lossless"]),
])
def test_onFormatChange_visibility(app, file_format, visible_widgets):
    app.format_cmb.setCurrentIndex(app.format_cmb.findText(file_format))
    assert app.format_cmb.currentText() == file_format
    
    # Effort
    effort = "effort" in visible_widgets
    assert app.int_effort_cb.isVisibleTo(app) == ("int_effort" in visible_widgets)
    assert app.effort_sb.isVisibleTo(app) == effort
    assert app.effort_l.isVisibleTo(app) == effort
    
    # Quality
    quality = "quality" in visible_widgets
    assert app.quality_l.isVisibleTo(app) == quality
    assert app.quality_sl.isVisibleTo(app) == quality
    assert app.quality_sb.isVisibleTo(app) == quality
    
    # Lossless
    assert app.lossless_cb.isVisibleTo(app) == ("lossless" in visible_widgets)
    
    # Misc.
    jxl_modular = "jxl_modular" in visible_widgets
    assert app.jxl_modular_cb.isVisibleTo(app) == jxl_modular
    assert app.jxl_modular_l.isVisibleTo(app) == jxl_modular

    chroma_subsampling = "chroma_subsampling" in visible_widgets
    assert app.chroma_subsampling_l.isVisibleTo(app) == chroma_subsampling
    assert (
        app.chroma_subsampling_jpegli_cmb.isVisibleTo(app) == chroma_subsampling or
        app.chroma_subsampling_avif_cmb.isVisibleTo(app) == chroma_subsampling or
        app.chroma_subsampling_jpg_cmb.isVisibleTo(app) == chroma_subsampling
    )

    smallest_lossless = "smallest_lossless" in visible_widgets
    assert app.smallest_lossless_png_cb.isVisibleTo(app) == smallest_lossless
    assert app.smallest_lossless_webp_cb.isVisibleTo(app) == smallest_lossless
    assert app.smallest_lossless_jxl_cb.isVisibleTo(app) == smallest_lossless
    assert app.max_compression_cb.isVisibleTo(app) == smallest_lossless
    assert app.jxl_png_fallback_cb.isVisibleTo(app) == ("png_fallback" in visible_widgets)

def test_onFormatChange_lossless_glitch(app):
    """Tests if an option set in one format affects others."""
    app.lossless_cb.setChecked(True)
    assert not app.quality_sl.isEnabled()

    app.format_cmb.setCurrentIndex(app.format_cmb.findText("WebP"))
    assert app.quality_sl.isEnabled()

    app.format_cmb.setCurrentIndex(app.format_cmb.findText("JPEG XL"))
    
def test_onFormatChange_int_e_glitch(app):
    app.int_effort_cb.setChecked(True)
    assert not app.effort_sb.isEnabled()

    app.format_cmb.setCurrentIndex(app.format_cmb.findText("AVIF"))
    assert app.effort_sb.isEnabled()

    app.format_cmb.setCurrentIndex(app.format_cmb.findText("JPEG XL"))
    assert not app.effort_sb.isEnabled()

def test_jpeg_xl_effort_10(app):
    app.format_cmb.setCurrentIndex(app.format_cmb.findText("JPEG XL"))
    
    assert app.effort_sb.maximum() == 9
    app.setJxlEffort10Enabled(True)
    assert app.effort_sb.maximum() == 10

@pytest.mark.parametrize("file_format, min_val, max_val", [
    ("JPEG XL", 1, 9),
    ("AVIF", 0, 10),
])
def test_effort_ranges(app, file_format, min_val, max_val):
    app.format_cmb.setCurrentIndex(app.format_cmb.findText(file_format))
    
    assert app.effort_sb.minimum() == min_val
    assert app.effort_sb.maximum() == max_val

def test_chooseOutput_var_default(app):
    with (
        patch("ui.output_tab.QFileDialog") as mock_qfiledialog,
        patch("ui.widget_manager.WidgetManager.getVar", return_value=None),
    ):
        mock_qfiledialog.return_value.exec.return_value = False

        app.chooseOutput()

        mock_qfiledialog.assert_called_once_with(app, ANY, QDir.homePath())

def test_chooseOutput_var_load(app):
    last_used = "/home/user/Pictures"
    with (
        patch("ui.output_tab.QFileDialog") as mock_qfiledialog,
        patch("ui.widget_manager.WidgetManager.getVar", return_value=last_used),
        patch("ui.widget_manager.WidgetManager.setVar") as mock_setVar,
    ):
        mock_qfiledialog.return_value.exec.return_value = False

        app.chooseOutput()

        mock_qfiledialog.assert_called_once_with(app, ANY, last_used)

def test_chooseOutput_var_save(app):
    last_used = "/home/user/Pictures"
    with (
        patch("ui.output_tab.QFileDialog") as mock_qfiledialog,
        patch("ui.widget_manager.WidgetManager.getVar", return_value=last_used),
        patch("ui.widget_manager.WidgetManager.setVar") as mock_setVar,
    ):
        mock_qfiledialog.return_value.exec.return_value = True
        mock_qfiledialog.return_value.directory.return_value.absolutePath.return_value = last_used
        app.choose_output_ct_le = MagicMock()

        app.chooseOutput()

        mock_setVar.assert_called_once_with("choose_output_last_dir", last_used)
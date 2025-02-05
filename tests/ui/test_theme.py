import logging
from unittest.mock import patch, MagicMock
from contextlib import ExitStack
from pathlib import Path

import pytest

import ui.theme as theme

@pytest.mark.parametrize("available_theme", ("Ralsei", "Dark Amber", "Light Amber"))
def test_setTheme_no_exceptions_svg_present(available_theme, caplog):
    """Fails on undefined variables and if SVG files are not found."""
    mock_qapp_instance = MagicMock()
    mock_qapp_instance.setStyle = MagicMock()
    mock_qapp_instance.setStyleSheet = MagicMock()

    with (
        patch("ui.theme.QApplication.instance", return_value=mock_qapp_instance),
        patch("ui.theme.StyledLabel.updateStyleForAll") as mock_updateStyleForAll,
    ):
        theme.setTheme(available_theme)
        assert len(caplog.records) == 0, [log.msg for log in caplog.records]
        mock_updateStyleForAll.assert_called_once()

    mock_qapp_instance.setStyle.assert_called_once_with("Fusion")
    mock_qapp_instance.setStyleSheet.assert_called_once()

def test_setTheme_unrecognized_theme(caplog):
    mock_qapp_instance = MagicMock()

    with (
        patch("ui.theme.QApplication.instance", return_value=mock_qapp_instance) as mock_instance,
    ):
        theme.setTheme("unknown")
        mock_instance.assert_not_called()
        assert len(caplog.records) == 1
        assert "Unrecognized theme" in caplog.records[0].msg

@pytest.fixture
def _getIconPath_patches():
    patches = {
        "is_file": patch("ui.theme.Path.is_file", return_value=True),
    }

    variables = {
        "ASSETS_ICONS_DIR": patch("ui.theme.constants.ASSETS_ICONS_DIR", "./assets/icons/"),
    }

    with ExitStack() as stack:
        _mocks = {name: stack.enter_context(patcher) for name, patcher in patches.items()}
        _variables = {name: stack.enter_context(patcher) for name, patcher in variables.items()}

        yield _mocks, _variables

def test__getIconPath_happy_path(_getIconPath_patches, caplog):
    mocks, variables = _getIconPath_patches

    assert theme._getIconPath("test_icon.svg") == Path(variables["ASSETS_ICONS_DIR"], "test_icon.svg").as_posix()
    assert caplog.records == []

def test__getIconPath_sad_path(_getIconPath_patches, caplog):
    mocks, variables = _getIconPath_patches
    mocks["is_file"].return_value = False

    assert theme._getIconPath("test_icon.svg") == ""
    assert "Cannot find icon" in caplog.records[0].msg

def test_hexToRGBA_happy_path():
    assert theme.hexToRGBA("#111111", 127) == "rgba(17, 17, 17, 127)"

@pytest.mark.parametrize("invalid_hex_color", [
    "#11111",
    "#111111F",
    "#11111G",
])
def test_hexToRGBA_exceptions(invalid_hex_color):
    with pytest.raises(ValueError) as exc_info:
        theme.hexToRGBA(invalid_hex_color)

def test__createTheme_no_exceptions(caplog):
    with (
        caplog.at_level(logging.ERROR),
    ):
        stylesheet=theme._createTheme(
            accent_big="#00ff76",
            accent_small="#ff0066",
            font="#e9e9e9",
            font_disabled="#9A9A9A",
            canvas="#141414",
            border="#404040",
            progress_bar_text="#ff0066",
            theme_name="Ralsei",
        )
        assert "color: #00ff76" in stylesheet
        assert "color: #ff0066" in stylesheet
        assert "color: #e9e9e9" in stylesheet
        assert "color: #9A9A9A" in stylesheet
        assert "background-color: #141414" in stylesheet
        assert "#404040" in stylesheet
        assert "color: #ff0066" in stylesheet
        assert len(caplog.records) == 0 # SVG files present
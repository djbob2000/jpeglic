from unittest.mock import patch, MagicMock
import os
from contextlib import ExitStack

import pytest

import ui.theme as theme

def test_setTheme_no_exception():
    """Fails on undefined variables."""
    mock_qapp_instance = MagicMock()
    mock_qapp_instance.setStyle = MagicMock()
    mock_qapp_instance.setStyleSheet = MagicMock()

    with (
        patch("ui.theme.QApplication.instance", return_value=mock_qapp_instance),
    ):
        theme.setTheme("Ralsei")

    mock_qapp_instance.setStyle.assert_called_once_with("Fusion")
    mock_qapp_instance.setStyleSheet.assert_called_once()

@pytest.fixture
def _getIconPath_patches():
    patches = {
        "isfile": patch("ui.theme.os.path.isfile", return_value=True),
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

    assert theme._getIconPath("test_icon.svg") == os.path.join(variables["ASSETS_ICONS_DIR"], "test_icon.svg")
    assert caplog.records == []

def test__getIconPath_sad_path(_getIconPath_patches, caplog):
    mocks, variables = _getIconPath_patches
    mocks["isfile"].return_value = False

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
import logging
from unittest.mock import patch, MagicMock
from contextlib import ExitStack

from PySide6.QtWidgets import QWidget, QLabel, QComboBox
from PySide6.QtCore import QUrl, QObject
import pytest

import ui.utils as utils

@pytest.mark.parametrize("tooltip, widget_count",[
    ("Test", 1),
    ("Line 1\n\nLine 2", 5),
    ("", 2),
    ("ABC" * 1000, 5),
])
def test_setToolTip_valid(tooltip, widget_count, qapp):
    widgets = [QWidget() for _ in range(widget_count)]
    utils.setToolTip(tooltip, *widgets)
    for widget in widgets:
        assert widget.toolTip() == tooltip

def test_setToolTip_wrong_type(caplog):
    with caplog.at_level(logging.ERROR):
        utils.setToolTip("123", object())      # No exception

    assert "Failed to apply tooltip" in caplog.text

def test_setToolTip_mixed_type(qapp, caplog):
    valid_widgets = [QWidget() for _ in range(3)]
    invalid_widgets = [object() for _ in range(3)]

    with caplog.at_level(logging.ERROR):
        utils.setToolTip("123", *valid_widgets, *invalid_widgets)
    
    for widget in valid_widgets:
        assert widget.toolTip() == "123"
    assert "Failed to apply tooltip" in caplog.text

@pytest.fixture
def mock_environ():
    with patch("os.environ", {
        "LD_LIBRARY_PATH": "/opt/app/_internal",
        "QT_PLUGIN_PATH": "/opt/app/_internal/PySide6/Qt/plugins",
        "QT_QPA_PLATFORM_PLUGIN_PATH": "/opt/app/_internal",
        "QML2_IMPORT_PATH": "/opt/app/_internal/PySide6/Qt/qml",
    }) as mock_env:
        yield mock_env

def test__sanitizeEnviron(mock_environ):
    assert mock_environ["LD_LIBRARY_PATH"] == "/opt/app/_internal"
    assert mock_environ["QT_PLUGIN_PATH"] == "/opt/app/_internal/PySide6/Qt/plugins"
    assert mock_environ["QT_QPA_PLATFORM_PLUGIN_PATH"] == "/opt/app/_internal"
    assert mock_environ["QML2_IMPORT_PATH"] == "/opt/app/_internal/PySide6/Qt/qml"

    with utils._sanitizeEnviron():
        assert "LD_LIBRARY_PATH" not in mock_environ
        assert "QT_PLUGIN_PATH" not in mock_environ
        assert "QT_QPA_PLATFORM_PLUGIN_PATH" not in mock_environ
        assert "QML2_IMPORT_PATH" not in mock_environ

    assert mock_environ["LD_LIBRARY_PATH"] == "/opt/app/_internal"
    assert mock_environ["QT_PLUGIN_PATH"] == "/opt/app/_internal/PySide6/Qt/plugins"
    assert mock_environ["QT_QPA_PLATFORM_PLUGIN_PATH"] == "/opt/app/_internal"
    assert mock_environ["QML2_IMPORT_PATH"] == "/opt/app/_internal/PySide6/Qt/qml"

def test_openRemoteUrl():
    with patch("ui.utils.openUrl") as mock_openUrl:
        utils.openRemoteUrl("https://example.com")
    
        mock_openUrl.assert_called_once_with("https://example.com")

def test_openLocalUrl():
    with patch("ui.utils.openUrl") as mock_openUrl:
        utils.openLocalUrl("/path/to/file.txt")
    
        mock_openUrl.assert_called_once_with(QUrl.fromLocalFile("/path/to/file.txt"))

@pytest.fixture
def mock_openUrl():
    patches = {
        "system": patch("ui.utils.platform.system", return_value="Linux"),
        "openUrl": patch("ui.utils.QDesktopServices.openUrl"),
        "sanitize": patch("ui.utils._sanitizeEnviron"),
        "logging": patch("ui.utils.logging.error"),
    }

    with ExitStack() as stack:
        yield { name: stack.enter_context(patcher) for name, patcher in patches.items() }

@pytest.mark.parametrize("platform_name, use_sanitize",[
    ("Linux", True),
    ("Windows", False),
    ("Darwin", False),
])
def test_openUrl_sanitize(platform_name, use_sanitize, mock_openUrl):
    mock_openUrl["system"].return_value = platform_name
    url = QUrl("https://example.com")

    utils.openUrl(url)

    mock_openUrl["openUrl"].assert_called_once_with(url)
    assert mock_openUrl["sanitize"].called == use_sanitize

def test_openUrl_exception(mock_openUrl):
    mock_openUrl["openUrl"].side_effect = Exception("test")
    url = QUrl("https://example.com")

    utils.openUrl(url)

    assert "test" in mock_openUrl["logging"].call_args[0][0]

def test_isPathValidStr_valid():
    with patch("ui.utils.os.access", return_value=True):
        assert utils.isPathValidStr("/home/Pictures") == True

def test_isPathValidStr_invalid_type():
    with patch("ui.utils.os.access", return_value=True):
        assert utils.isPathValidStr(None) == False

def test_isPathValidStr_invalid_no_access():
    with patch("ui.utils.os.access", return_value=False):
        assert utils.isPathValidStr("/home/Pictures") == False
    
def test_createQHBoxLayout_all_valid():
    widgets = [QLabel("test"), QComboBox(), QWidget()]

    widgets_hb = utils.createQHBoxLayout(*widgets)
    for widget in widgets:
        assert widgets_hb.indexOf(widget) != -1
    assert widgets_hb.count() == 3

def test_createQHBoxLayout_no_valid_args(caplog):
    caplog.set_level(logging.ERROR)
    widgets_hb = utils.createQHBoxLayout(None, "test", 0)
    assert widgets_hb.count() == 0
    assert sum(1 for record in caplog.records if record.levelname == "ERROR") == 3
    assert "Type mismatch" in caplog.text

def test_createQHBoxLayout_mixed(caplog):
    widgets = [QLabel("test"), None, QComboBox()]

    widgets_hb = utils.createQHBoxLayout(*widgets)

    for widget in widgets:
        if not isinstance(widget, QWidget):
            continue
        assert widgets_hb.indexOf(widget) != -1
    assert widgets_hb.count() == 2
    assert sum(1 for record in caplog.records if record.levelname == "ERROR") == 1
    assert "Type mismatch" in caplog.text

def test_createQHBoxLayout_addWidget_failed(caplog):
    with patch("ui.utils.QHBoxLayout.addWidget", side_effect=Exception):
        widgets_hb = utils.createQHBoxLayout(QLabel("test"))

    assert widgets_hb.count() == 0
    assert sum(1 for record in caplog.records if record.levelname == "ERROR") == 1
    assert "Failed to add a widget" in caplog.text

def test_blockSignals_all_valid():
    objects = [
        MagicMock(spec=QObject),
        MagicMock(spec=QObject),
    ]

    with utils.blockSignals(*objects):
        for obj in objects:
            obj.blockSignals.assert_called_once_with(True)

    for obj in objects:
        obj.blockSignals.assert_called_with(False)

def test_blockSignals_mixed():
    _object = MagicMock(spec=QObject)

    with utils.blockSignals(_object, None, "test"):
        _object.blockSignals.assert_called_once_with(True)

    _object.blockSignals.assert_called_with(False)
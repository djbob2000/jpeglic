from unittest.mock import patch, MagicMock
from contextlib import ExitStack

import pytest
from PySide6.QtCore import QSize, QRect, QPoint
from PySide6.QtTest import QSignalSpy

import ui.dialogs.update_checker as update_checker

@pytest.fixture
def dialog(app):
    return update_checker.Dialog()

def test_dialog_init(dialog):
    pass

def test_dialog_resizeToContent(dialog):
    sample_size_hint = MagicMock(spec=QSize)
    mock_main_lt = MagicMock()
    mock_main_lt.sizeHint = sample_size_hint
    mock_qr = MagicMock(spec=QRect)
    mock_cp = MagicMock(spec=QPoint)

    mock_screen = MagicMock()
    mock_screen.availableGeometry.return_value.center.return_value = mock_cp

    with (
        patch.object(dialog, "setMinimumSize") as mock_setMinimumSize,
        patch.object(dialog.main_lt, "sizeHint", return_value=sample_size_hint),
        patch.object(dialog, "frameGeometry", return_value=mock_qr) as mock_frameGeometry,
        patch("ui.dialogs.update_checker.QGuiApplication.primaryScreen", return_value=mock_screen),
        patch.object(dialog, "move") as mock_move,
    ):
        dialog.resizeToContent()

        mock_setMinimumSize.assert_called_once_with(sample_size_hint)
        mock_frameGeometry.assert_called_once()
        mock_qr.moveCenter.assert_called_once_with(mock_cp)
        mock_move.assert_called_once_with(mock_qr.topLeft())

def test_dialog_onLinkBtnPress_link_exists(dialog):
    sample_url = "sample_url"
    dialog.link_btn_url = sample_url
    with (
        patch("ui.dialogs.update_checker.openRemoteUrl") as mock_openRemoteUrl,
        patch.object(dialog, "close") as mock_close,
    ):
        dialog._onLinkBtnPress()

        mock_openRemoteUrl.assert_called_once_with(sample_url)
        mock_close.assert_called_once()

def test_dialog_onLinkBtnPress_no_link(dialog):
    dialog.link_btn_url = None
    with (
        patch("ui.dialogs.update_checker.openRemoteUrl") as mock_openRemoteUrl,
    ):
        dialog._onLinkBtnPress()

        mock_openRemoteUrl.assert_not_called()

@pytest.fixture
def dialog_show_patched(dialog):
    mocks = {
        "text_l.setText": patch.object(dialog.text_l, "setText"),
        "link_btn.setText": patch.object(dialog.link_btn, "setText"),
        "link_btn.setVisible": patch.object(dialog.link_btn, "setVisible"),
        "resizeToContent": patch.object(dialog, "resizeToContent"),
    }

    with ExitStack() as stack:
        _mocks = {name: stack.enter_context(patcher) for name, patcher in mocks.items()}
        yield dialog, _mocks

def test_dialog_show_only_message(dialog_show_patched):
    dialog, mocks = dialog_show_patched
    sample_msg = "sample message"

    dialog.show(sample_msg)

    mocks["text_l.setText"].assert_called_once_with(sample_msg)
    mocks["link_btn.setText"].assert_not_called()
        
def test_dialog_show_message_and_url(dialog_show_patched):
    dialog, mocks = dialog_show_patched
    sample_msg, sample_url = "sample message", "sample_url"
    
    dialog.show(
        sample_msg,
        sample_url
    )

    mocks["text_l.setText"].assert_called_once_with(sample_msg)
    mocks["link_btn.setText"].assert_called_once_with("Open Link")
    dialog.link_btn_url == sample_url
        
def test_dialog_show_message_and_url_text(dialog_show_patched):
    dialog, mocks = dialog_show_patched
    sample_msg, sample_url, sample_url_text = "sample message", "sample_url", "sample_url_text"
    dialog.show(
        sample_msg,
        sample_url,
        sample_url_text,
    )

    mocks["text_l.setText"].assert_called_once_with(sample_msg)
    mocks["link_btn.setText"].assert_called_once_with(sample_url_text)
    dialog.link_btn_url == sample_url

def test_dialog_show_resize_to_content(dialog_show_patched):
    dialog, mocks = dialog_show_patched
    sample_msg = "sample message"
   
    dialog.show(
        sample_msg,
        resize_to_content=True,
    )

    mocks["resizeToContent"].assert_called_once()

def test_dialog_reject(dialog):
    closed_spy = QSignalSpy(dialog.closed)
    dialog.reject()
    assert closed_spy.count() == 1

def test_dialog_accept(dialog):
    closed_spy = QSignalSpy(dialog.closed)
    dialog.accept()
    assert closed_spy.count() == 1


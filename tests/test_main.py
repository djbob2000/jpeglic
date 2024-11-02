from unittest.mock import patch, create_autospec, MagicMock
import pytest
from contextlib import ExitStack

from PySide6.QtWidgets import QWidget, QTabWidget
from PySide6.QtCore import QThreadPool, QMimeData, QPoint
from PySide6.QtGui import QCloseEvent, QDragEnterEvent, QDropEvent, QMoveEvent
from PySide6.QtTest import QSignalSpy

from main import MainWindow
from core.controller import CheckStatus, CheckFlags
from ui import SettingsTab, InputTab, OutputTab, ModifyTab, AboutTab
from conftest import profile_test

class MockTab(QWidget):
    def __init__(self, *args, **kwargs):
        super().__init__()
        self.getSettings = MagicMock(return_value={})
        self.signals = MagicMock()
        self.convert = MagicMock()
        self.saveState = MagicMock()

class MockInputTab(MockTab):
    def __init__(self, *args, **kwargs):
        super().__init__()
        self.disableSorting = MagicMock()
        self.clearInput = MagicMock()
        self.getItems = MagicMock()
        self.file_view = MagicMock()
        self.file_view.return_value.dropEvent.return_value = MagicMock()

class MockOutputTab(MockTab):
    def __init__(self, *args, **kwargs):
        super().__init__()
        self.onJXLEffort10Enabled = MagicMock()
        self.onQualityPrecisionSnappingEnabled = MagicMock()
        self.onJPEGEncoderChanged = MagicMock()
        self.onJXLLossyModularVisibleToggled = MagicMock()
        self.onJXLIntEffortVisibleToggled = MagicMock()
        self.isClearAfterConvChecked = MagicMock()
        self.smIsFormatPoolEmpty = MagicMock()
        self.getUsedThreadCount = MagicMock()

class MockModifyTab(MockTab):
    def __init__(self, *args, **kwargs):
        super().__init__()
        self.toggleCustomResampling = MagicMock()
        self.disableDownscaling = MagicMock()

class MockTabWidget(QTabWidget):
    def __init__(self, *args, **kwargs):
        super().__init__()
        self.setEnabled = MagicMock()
        self.isEnabled = MagicMock(return_value=True)

class MockQThreadPool(QThreadPool):
    def __init__(self, *args, **kwargs):
        super().__init__()
        self.activeThreadCount = MagicMock(return_value=0)
        self.globalInstance = MagicMock(return_value=self)

@pytest.fixture
def main_window(qtbot):
    with (
        patch.multiple("main",
            QThreadPool=MockQThreadPool,
            LoggingManager=MagicMock(),
            Controller=MagicMock(),
            InputTab=MockInputTab,
            OutputTab=MockOutputTab,
            ModifyTab=MockModifyTab,
            AboutTab=MockTab,
            SettingsTab=MockTab,
            ExceptionView=MagicMock(),
            Notifications=MagicMock(),
            ProgressDialog=MagicMock(),
            QTabWidget=MockTabWidget,
        ),
        # patch("main.MainWindow.closeEvent"),
    ):
        main = MainWindow()
        qtbot.addWidget(main)
        yield main

@pytest.fixture
def main_window_patched(main_window):
    signals = {}

    patches = {
        "setUIEnabled": patch.object(main_window, "setUIEnabled"),
        "isUIEnabled": patch.object(main_window, "isUIEnabled", return_value=True),
        "progress_dlg_setRange": patch.object(main_window.progress_dlg, "setRange"),
        "progress_dlg_show": patch.object(main_window.progress_dlg, "show"),
        "progress_dlg_finished": patch.object(main_window.progress_dlg, "finished"),
        "controller_getItemCount": patch.object(main_window.controller, "getItemCount", return_value=100),
        "controller_startProcessing": patch.object(main_window.controller, "startProcessing"),
        "settings_tab_getSettings": patch.object(main_window.settings_tab, "getSettings", return_value={
            "play_sound_on_finish": False,
            "play_sound_on_finish_vol": 50,
            "no_exceptions": False,
        }),
        "finished_sound_play": patch("main.finished_sound.play"),
        "exception_view_isEmpty": patch.object(main_window.exception_view, "isEmpty", return_value=True),
        "exception_view_resizeToContent": patch.object(main_window.exception_view, "resizeToContent"),
        "exception_view_show": patch.object(main_window.exception_view, "show"),
        "exception_view_reset": patch.object(main_window.exception_view, "reset"),
        "task_status_wasCanceled": patch("main.task_status.wasCanceled"),
        "output_tab_isClearAfterConvChecked": patch.object(main_window.output_tab, "isClearAfterConvChecked", return_value=False),
        "output_tab_smIsFormatPoolEmpty": patch.object(main_window.output_tab, "smIsFormatPoolEmpty", return_value=False),
        "output_tab_getSettings": patch.object(main_window.output_tab, "getSettings", return_value={}),
        "modify_tab_getSettings": patch.object(main_window.modify_tab, "getSettings", return_value={}),
        "input_tab_clearInput": patch.object(main_window.input_tab, "clearInput"),
        "input_tab_file_view_topLevelItemCount": patch.object(main_window.input_tab.file_view, "topLevelItemCount", return_value=10),
        "controller_parseData": patch.object(main_window.controller, "parseData"),
        "controller_checkProcessingRequirements": patch.object(main_window.controller, "checkProcessingRequirements", return_value=CheckStatus()),
        "input_tab_getItems": patch.object(main_window.input_tab, "getItems", return_value=["item_0", "item_1"]),
        "notifications_notify": patch.object(main_window.notifications, "notify"),
        "modify_tab_disableDownscaling": patch.object(main_window.modify_tab, "disableDownscaling"),
        "output_tab_getUsedThreadCount": patch.object(main_window.output_tab, "getUsedThreadCount"),
    }    

    with ExitStack() as stack:
        mocks = {name: stack.enter_context(patcher) for name, patcher in patches.items()}
        yield main_window, mocks, signals

def test_init(main_window):
    pass

def test_startProcessing(main_window_patched):
    main_window, mocks, *_ = main_window_patched

    main_window.startProcessing()

    mocks["setUIEnabled"].assert_called_once_with(False)
    mocks["progress_dlg_setRange"].assert_called_once_with(0, mocks["controller_getItemCount"].return_value)
    mocks["progress_dlg_show"].assert_called_once()

def test_finishProcessing(main_window_patched):
    main_window, mocks, *_ = main_window_patched

    main_window.finishProcessing()

    mocks["progress_dlg_finished"].assert_called_once()
    mocks["setUIEnabled"].assert_called_once_with(True)

@pytest.mark.parametrize("play_sound_on_finish", [True, False])
def test_finishProcessing_play_sound(play_sound_on_finish, main_window_patched):
    main_window, mocks, *_ = main_window_patched
    mocks["settings_tab_getSettings"].return_value = mocks["settings_tab_getSettings"].return_value | {"play_sound_on_finish": play_sound_on_finish}

    main_window.finishProcessing()
    if play_sound_on_finish:
        mocks["finished_sound_play"].assert_called_once_with(volume=mocks["settings_tab_getSettings"].return_value["play_sound_on_finish_vol"])
    else:
        mocks["finished_sound_play"].assert_not_called()

@pytest.mark.parametrize("exception_view_empty, no_exceptions, was_canceled, expected_run", [
    (False, False, False, True),
    (True, False, False, False),
    (False, True, False, False),
    (False, False, True, False),
    (False, True, True, False),
])
def test_finishProcessing_exception_view(exception_view_empty, no_exceptions, was_canceled, expected_run, main_window_patched):
    main_window, mocks, *_ = main_window_patched
    mocks["exception_view_isEmpty"].return_value = exception_view_empty
    mocks["task_status_wasCanceled"].return_value = was_canceled
    mocks["settings_tab_getSettings"].return_value = mocks["settings_tab_getSettings"].return_value | {"no_exceptions": no_exceptions}

    main_window.finishProcessing()

    if not exception_view_empty and not no_exceptions and not was_canceled:
        mocks["exception_view_show"].assert_called_once()
        mocks["exception_view_resizeToContent"].assert_called_once()
    else:
        mocks["exception_view_show"].assert_not_called()
        mocks["exception_view_resizeToContent"].assert_not_called()

@pytest.mark.parametrize("clear", [True, False])
def test_finishProcessing_clear_after_conv(clear, main_window_patched):
    main_window, mocks, *_ = main_window_patched
    mocks["output_tab_isClearAfterConvChecked"].return_value = clear

    main_window.finishProcessing()

    if clear:
        mocks["input_tab_clearInput"].assert_called_once()
    else:
        mocks["input_tab_clearInput"].assert_not_called()

def test_convert(main_window_patched):
    main_window, mocks, *_ = main_window_patched

    main_window.convert()

    mocks["controller_parseData"].assert_called_once_with(mocks["input_tab_getItems"].return_value)
    mocks["exception_view_reset"].assert_called_once()
    main_window.settings_tab.saveState.assert_called_once_with(mocks["settings_tab_getSettings"].return_value)
    main_window.output_tab.saveState.assert_called_once_with(mocks["output_tab_getSettings"].return_value)
    main_window.modify_tab.saveState.assert_called_once_with(mocks["modify_tab_getSettings"].return_value)
    mocks["controller_startProcessing"].assert_called_once_with(
        mocks["output_tab_getSettings"].return_value,
        mocks["modify_tab_getSettings"].return_value,
        mocks["settings_tab_getSettings"].return_value,
        mocks["output_tab_getUsedThreadCount"].return_value,
    )

@pytest.mark.parametrize("display", [True, False])
def test_convert_display_error(display, main_window_patched):
    main_window, mocks, *_ = main_window_patched
    check_status = CheckStatus()
    check_status.setError(
        "title",
        "description",
        display_error=display
    )
    mocks["controller_checkProcessingRequirements"].return_value = check_status

    main_window.convert()

    if display:
        mocks["notifications_notify"].assert_called_once_with(check_status.error_title, check_status.error_description)
    else:
        mocks["notifications_notify"].assert_not_called()

@pytest.mark.parametrize("include_flag", [True, False])
def test_convert_disable_downscaling(include_flag, main_window_patched):
    main_window, mocks, *_ = main_window_patched
    check_status = CheckStatus()
    if include_flag:
        check_status.addFlags(CheckFlags.DISABLE_DOWNSCALING)
    mocks["controller_checkProcessingRequirements"].return_value = check_status

    main_window.convert()

    if include_flag:
        mocks["modify_tab_disableDownscaling"].assert_called_once()
    else:
        mocks["modify_tab_disableDownscaling"].assert_not_called()

@pytest.mark.parametrize("allowed_to_proceed", [True, False])
def test_convert_allowed_to_proceed(allowed_to_proceed, main_window_patched):
    main_window, mocks, *_ = main_window_patched
    check_status = CheckStatus()
    check_status.allowed_to_proceed = allowed_to_proceed
    mocks["controller_checkProcessingRequirements"].return_value = check_status

    main_window.convert()

    if allowed_to_proceed:
        mocks["exception_view_reset"].assert_called_once()
    else:
        mocks["exception_view_reset"].assert_not_called()

def test_setUIEnabled(main_window):
    main_window.setUIEnabled(True)
    main_window.tabs.setEnabled.assert_called_once_with(True)

@pytest.mark.parametrize("enabled", [True, False])
def test_isUIEnabled(enabled, main_window):
    main_window.tabs.isEnabled.return_value = enabled
    assert main_window.isUIEnabled() == main_window.tabs.isEnabled.return_value

def test_closeEvent(main_window):
    with (
        patch("main.ProcessManager.terminateAll") as mock_terminateAll,
    ):
        main_window.closeEvent(QCloseEvent())

        main_window.settings_tab.saveState.assert_called_once()
        main_window.output_tab.saveState.assert_called_once()
        main_window.modify_tab.saveState.assert_called_once()
        main_window.input_tab.saveState.assert_called_once()
        mock_terminateAll.assert_not_called()
    
def test_closeEvent_terminateAll(main_window):
    with (
        patch.object(main_window.threadpool, "activeThreadCount", return_value=1) as mock_activeThreadCount,
        patch("main.ProcessManager.terminateAll") as mock_terminateAll,
    ):
        main_window.closeEvent(QCloseEvent())

        mock_terminateAll.assert_called_once()

def test_closeEvent_dont_terminateAll(main_window):
    with (
        patch.object(main_window.threadpool, "activeThreadCount", return_value=1) as mock_activeThreadCount,
        patch("main.ProcessManager.terminateAll") as mock_terminateAll,
    ):
        main_window.closeEvent(QCloseEvent())

        mock_terminateAll.assert_called_once()

def test_dragEnterEvent_ui_disabled(main_window_patched):
    main_window, mocks, *_ = main_window_patched
    mocks["isUIEnabled"].return_value = False
    mock_event = MagicMock(spec=QDragEnterEvent)

    main_window.dragEnterEvent(mock_event)

    mock_event.accept.assert_not_called()
    mock_event.ignore.assert_called_once()

def test_dragEnterEvent_ui_enabled_with_urls(main_window_patched):
    main_window, mocks, *_ = main_window_patched
    mocks["isUIEnabled"].return_value = True
    mock_event = MagicMock(spec=QDragEnterEvent)
    mock_event.mimeData().hasUrls.return_value = True

    main_window.dragEnterEvent(mock_event)

    mock_event.accept.assert_called_once()
    mock_event.ignore.assert_not_called()

def test_dragEnterEvent_ui_enabled_no_urls(main_window_patched):
    main_window, mocks, *_ = main_window_patched
    mocks["isUIEnabled"].return_value = True
    mock_event = MagicMock(spec=QDragEnterEvent)
    mock_event.mimeData().hasUrls.return_value = False

    main_window.dragEnterEvent(mock_event)

    mock_event.accept.assert_not_called()
    mock_event.ignore.assert_called_once()

@pytest.mark.parametrize("has_urls", [True, False])
def test_dropEvent(has_urls, main_window_patched):
    main_window, mocks, *_ = main_window_patched
    mock_event = MagicMock(spec=QDropEvent)
    mock_event.mimeData().hasUrls.return_value = has_urls

    with (
        patch.object(main_window.tabs, "setCurrentIndex") as mock_setCurrentIndex,
    ):
        main_window.dropEvent(mock_event)

        assert mock_event.accept.call_count == (1 if has_urls else 0)
        assert mock_event.ignore.call_count == (0 if has_urls else 1)
        if has_urls:
            mock_setCurrentIndex.assert_called_once_with(0)
            main_window.input_tab.file_view.dropEvent.assert_called_once_with(mock_event)
        else:
            mock_setCurrentIndex.assert_not_called()
            main_window.input_tab.file_view.dropEvent.assert_not_called()

def test_moveEvent(main_window):
    moved_spy = QSignalSpy(main_window.moved)

    main_window.moveEvent(QMoveEvent(QPoint(0,0), QPoint(0,1)))

    assert moved_spy.count() == 1

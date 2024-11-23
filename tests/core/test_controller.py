from unittest.mock import patch, MagicMock, Mock
from contextlib import ExitStack, contextmanager
import logging

import pytest
from PySide6.QtCore import (
    QThreadPool,
)
from PySide6.QtTest import QSignalSpy

from core.controller import Controller, CheckFlags, CheckStatus
from core.worker import Worker

@pytest.fixture
def controller():
    yield Controller(
        MagicMock(autospec=QThreadPool()),
    )

def test_init(controller):
    # Checks for exceptions on fixture use
    return

@pytest.fixture
def output_tab_settings():
    return {
        "format": "JPEG XL",
        "keep_dir_struct": False,
        "custom_output_dir": False,
        "custom_output_dir_path": "Pictures",
        "effort": 7,
        "jxl_modular": False,
        "lossless": False,
        "intelligent_effort": False,
    }

@pytest.fixture
def modify_tab_settings():
    return {
       "downscaling": {
            "enabled": False,
       } 
    }

@pytest.fixture
def settings_tab_settings():
    return {
        "jxl_optimizer": False,
    }

@pytest.fixture
def controller_checkProcessingRequirements_patched(controller):
    patches = {
        "makedirs": patch("core.controller.os.makedirs"),
        "is_absolute": patch("core.controller.Path.is_absolute", return_value=True),
        "getItemCount": patch.object(controller.items, "getItemCount", return_value=100),
        "activeThreadCount": patch.object(controller.threadpool, "activeThreadCount", return_value=0),
    }

    with ExitStack() as stack:
        mocks = {name: stack.enter_context(patcher) for name, patcher in patches.items()}
        yield controller, mocks

def test_checkProcessingRequirements_happy_path(controller_checkProcessingRequirements_patched, output_tab_settings, modify_tab_settings):
    controller, mocks = controller_checkProcessingRequirements_patched
  
    cs = controller.checkProcessingRequirements(100, False, output_tab_settings, modify_tab_settings)
    assert cs.allowed_to_proceed
    assert not cs.display_error

def test_checkProcessingRequirements_fail_item_count(controller_checkProcessingRequirements_patched, output_tab_settings, modify_tab_settings):
    controller, mocks = controller_checkProcessingRequirements_patched
    cs = controller.checkProcessingRequirements(0, False, output_tab_settings, modify_tab_settings)
    assert not cs.allowed_to_proceed
    assert cs.display_error

def test_checkProcessingRequirements_fail_path_conflict(controller_checkProcessingRequirements_patched, output_tab_settings, modify_tab_settings):
    controller, mocks = controller_checkProcessingRequirements_patched
    output_tab_settings["custom_output_dir"] = True
    output_tab_settings["keep_dir_struct"] = True
    mocks["is_absolute"].return_value = False

    cs = controller.checkProcessingRequirements(100, False, output_tab_settings, modify_tab_settings)
    assert not cs.allowed_to_proceed
    assert cs.display_error

def test_checkProcessingRequirements_fail_empty_format_pool(controller_checkProcessingRequirements_patched, output_tab_settings, modify_tab_settings):
    controller, mocks = controller_checkProcessingRequirements_patched
    output_tab_settings["format"] = "Smallest Lossless"

    cs = controller.checkProcessingRequirements(100, True, output_tab_settings, modify_tab_settings)
    assert not cs.allowed_to_proceed
    assert cs.display_error

@pytest.mark.parametrize("mode", [
    "Smallest Lossless",
    "Lossless JPEG Transcoding",
    "JPEG Reconstruction",
])
def test_checkProcessingRequirements_disable_downscaling(mode, controller_checkProcessingRequirements_patched, output_tab_settings, modify_tab_settings):
    controller, mocks = controller_checkProcessingRequirements_patched
    modify_tab_settings["downscaling"]["enabled"] = True
    output_tab_settings["format"] = mode

    cs = controller.checkProcessingRequirements(100, False, output_tab_settings, modify_tab_settings)
    assert cs.allowed_to_proceed
    assert cs.display_error
    assert CheckFlags.DISABLE_DOWNSCALING in cs.flags

def test_checkProcessingRequirements_parsing_error(controller_checkProcessingRequirements_patched, output_tab_settings, modify_tab_settings):
    controller, mocks = controller_checkProcessingRequirements_patched
    mocks["getItemCount"].return_value = 0

    cs = controller.checkProcessingRequirements(100, False, output_tab_settings, modify_tab_settings)
    assert not cs.allowed_to_proceed
    assert cs.display_error
    assert cs.error_title == "Data Error"

def test_checkProcessingRequirements_active_threads_error(controller_checkProcessingRequirements_patched, output_tab_settings, modify_tab_settings):
    controller, mocks = controller_checkProcessingRequirements_patched
    mocks["activeThreadCount"].return_value = 1

    cs = controller.checkProcessingRequirements(100, False, output_tab_settings, modify_tab_settings)
    assert not cs.allowed_to_proceed
    assert cs.display_error
    assert cs.error_title == "Still Processing"

def test_parseData(controller):
    items = ["item0", "item1"]

    with (
        patch.object(controller.items, "clear") as mock_clear,
        patch.object(controller.items, "parseData") as mock_parseData,
    ):
        controller.parseData(items)
        mock_clear.assert_called_once()
        mock_parseData.assert_called_once_with(*items)

def test_startProcessing(controller, output_tab_settings, modify_tab_settings, settings_tab_settings):
    processing_started_spy = QSignalSpy(controller.processing_started)
    update_progress_line1_spy = QSignalSpy(controller.update_progress_line1 )

    with (
        patch.object(controller.thread_manager, "isParallelRecommended", return_value=True) as mock_isParallelRecommended,
        patch.object(controller.thread_manager, "configure") as mock_configure,
        patch.object(controller.thread_manager, "getAvailableThreads", return_value=4),
        patch("core.controller.task_status.reset") as mock_task_status_reset,
        patch("core.controller.ProcessManager.clear") as mock_ProcessManager_clear,
        patch("core.controller.UniquePathStore.clear") as mock_UniquePathStore_clear,
        patch.object(controller.items, "getItemCount", return_value=100) as mock_getItemCount,
        patch.object(controller.items, "getItem", side_effect=[(f"abs_path_{i}", f"anchor_path_{i}") for i in range(100)]),
        patch("core.controller.Worker", autospec=Worker) as mock_worker,
        patch.object(controller.threadpool, "start") as mock_threadpool_start,
        patch.object(controller.time_left, "startCounting") as mock_startCounting,
    ):
        mock_worker.return_value.signals = Mock(
            started=Mock(),
            completed=Mock(),
            canceled=Mock(),
            exception=Mock(),
        )

        controller.startProcessing(output_tab_settings, modify_tab_settings, settings_tab_settings, 4)

        mock_isParallelRecommended.assert_called_once_with(
            output_tab_settings["format"],
            settings_tab_settings['jxl_optimizer'],
            output_tab_settings['effort'],
            output_tab_settings['jxl_modular'],
            output_tab_settings['lossless'],
            output_tab_settings['intelligent_effort'],
        )
        mock_configure.assert_called_once_with(
            output_tab_settings["format"],
            mock_getItemCount.return_value,
            4,
            mock_isParallelRecommended.return_value,
        )
        mock_task_status_reset.assert_called_once()
        mock_ProcessManager_clear.assert_called_once()
        mock_UniquePathStore_clear.assert_called_once()
        assert mock_worker.call_count == 100
        worker_calls = mock_worker.call_args_list
        for i in range(100):
            args, kwargs = worker_calls[i]
            assert args[0] == i
            assert args[1] == f"abs_path_{i}"
            assert args[2] == f"anchor_path_{i}"
            assert args[3] == output_tab_settings | modify_tab_settings
            assert args[4] == settings_tab_settings
            assert args[5] == 4
            assert args[6] == controller.mutex

        assert mock_worker.return_value.signals.started.connect.call_count == 100
        assert mock_worker.return_value.signals.completed.connect.call_count == 100
        assert mock_worker.return_value.signals.canceled.connect.call_count == 100
        assert mock_worker.return_value.signals.exception.connect.call_count == 100
        assert mock_threadpool_start.call_count == 100
        assert processing_started_spy.count() == 1
        assert update_progress_line1_spy.at(0)[0] == "Starting the conversion..."

def test_finishProcessing_happy_path(controller):
    processing_finished_spy = QSignalSpy(controller.processing_finished)
    with (
        patch.object(controller.time_left, "stopCounting") as mock_stopCounting,
        patch("core.controller.ProcessManager.clear") as mock_ProcessManager_clear,
    ):
        controller.finishProcessing()

        mock_stopCounting.assert_called_once()
        mock_ProcessManager_clear.assert_called_once()
        assert controller.finish_emitted
        assert processing_finished_spy.count() == 1

def test_finishProcessing_sad_path(controller):
    processing_finished_spy = QSignalSpy(controller.processing_finished)
    controller.finish_emitted = True

    controller.finishProcessing()

    assert processing_finished_spy.count() == 0

def test_getItemCount(controller):
    with patch.object(controller.items, "getItemCount", return_value=100):
        assert controller.getItemCount() == 100

def test_getCompletedItemCount(controller):
    with patch.object(controller.items, "getCompletedItemCount", return_value=100):
        assert controller.getCompletedItemCount() == 100

def test_getCompletedItemCount(controller):
    with (
        patch("core.controller.task_status.cancel") as mock_cancel,
        patch("core.controller.ProcessManager.terminateAll") as mock_terminateAll,
    ):
        controller.cancel()
        mock_cancel.assert_called_once()
        mock_terminateAll.assert_called_once()

def test_workerStarted(controller, caplog):
    caplog.set_level(logging.DEBUG)
    controller.workerStarted(0)
    assert caplog.records[0].levelname == "DEBUG"
    assert caplog.records[0].message == "[Worker #0] Started"

@pytest.fixture
def workerCompleted_patched(controller):
    signal_spies = {
        "update_progress_line1": QSignalSpy(controller.update_progress_line1),
        "update_progress_value": QSignalSpy(controller.update_progress_value),
    }

    patches = {
        "items_addCompletedItem": patch.object(controller.items, "addCompletedItem"),
        "time_left_addCompletedItem": patch.object(controller.time_left, "addCompletedItem"),
        "time_left_addSkippedItem": patch.object(controller.time_left, "addSkippedItem"),
        "items_getCompletedItemCount": patch.object(controller.items, "getCompletedItemCount", return_value=10),
        "items_getItemCount": patch.object(controller.items, "getItemCount", return_value=100),
        "task_status_wasCanceled": patch("core.controller.task_status.wasCanceled", return_value=False),
        "finishProcessing": patch.object(controller, "finishProcessing"),
        "activeThreadCount": patch.object(controller.threadpool, "activeThreadCount", return_value=1),
    }

    with ExitStack() as stack:
        mocks = {name: stack.enter_context(patcher) for name, patcher in patches.items()}
        yield controller, mocks, signal_spies

def assert_workerCompleted(workerCompleted_patched, caplog, assert_addCompletedItem=True, assert_addSkippedItem=False, assert_wasCanceled=False):
    controller, mocks, signal_spies = workerCompleted_patched
    
    if assert_addCompletedItem:
        mocks["time_left_addCompletedItem"].assert_called_once()
    if assert_addSkippedItem:
        mocks["time_left_addSkippedItem"].assert_called_once()
    assert signal_spies["update_progress_line1"].at(0)[0] == f"Converted {mocks['items_getCompletedItemCount'].return_value} out of {mocks['items_getItemCount'].return_value} images"
    assert signal_spies["update_progress_value"].at(0)[0] == mocks['items_getCompletedItemCount'].return_value
    assert len(caplog.records) == 2
    assert caplog.records[0].message == f"Active Workers: {mocks['activeThreadCount'].return_value}"
    assert caplog.records[1].message == "[Worker #0] Completed"
    if assert_wasCanceled:
        mocks["task_status_wasCanceled"].assert_called_once()

def test_workerCompleted_processing(workerCompleted_patched, caplog):
    controller, mocks, signal_spies = workerCompleted_patched
    caplog.set_level(logging.DEBUG)

    controller.workerCompleted(0, False)
    
    assert_workerCompleted(workerCompleted_patched, caplog)

def test_workerCompleted_completed(workerCompleted_patched, caplog):
    controller, mocks, signal_spies = workerCompleted_patched
    mocks["items_getCompletedItemCount"].return_value = 100
    caplog.set_level(logging.DEBUG)

    controller.workerCompleted(0, False)

    assert_workerCompleted(workerCompleted_patched, caplog)

def test_workerCompleted_skipped(workerCompleted_patched, caplog):
    controller, mocks, signal_spies = workerCompleted_patched
    caplog.set_level(logging.DEBUG)

    controller.workerCompleted(0, True)
    
    assert_workerCompleted(workerCompleted_patched, caplog, assert_addCompletedItem=False, assert_addSkippedItem=True)

def test_workerCompleted_canceled(workerCompleted_patched, caplog):
    controller, mocks, signal_spies = workerCompleted_patched
    mocks["task_status_wasCanceled"].return_value = True
    caplog.set_level(logging.DEBUG)

    controller.workerCompleted(0, False)
    
    assert_workerCompleted(workerCompleted_patched, caplog, assert_wasCanceled=True)

def test_workerCanceled(controller, caplog):
    caplog.set_level(logging.DEBUG)
    
    with patch.object(controller, "finishProcessing") as mock_finishProcessing:
        controller.workerCanceled(0)
        assert caplog.records[0].levelname == "DEBUG"
        assert caplog.records[0].message == "[Worker #0] Canceled"
        mock_finishProcessing.assert_called_once()

def test_CheckStatus_init():
    cs = CheckStatus()

    assert cs.allowed_to_proceed
    assert not cs.display_error
    assert cs.error_title == ""
    assert cs.error_description == ""
    assert cs.flags == []

def test_CheckStatus_setError():
    cs = CheckStatus()
    title, description, allowed_to_proceed, display_error = "Title", "Description", False, True
    cs.setError(title, description, allowed_to_proceed, display_error)
    assert cs.error_title == title
    assert cs.error_description == description
    assert cs.allowed_to_proceed == allowed_to_proceed
    assert cs.display_error == display_error

def test_CheckStatus_addFlags():
    cs = CheckStatus()
    cs.addFlags(CheckFlags.DISABLE_DOWNSCALING)
    assert CheckFlags.DISABLE_DOWNSCALING in cs.flags
    assert len(cs.flags) == 1
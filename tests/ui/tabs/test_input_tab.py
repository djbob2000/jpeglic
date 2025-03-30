from unittest.mock import patch, MagicMock, ANY
from pathlib import Path
from contextlib import ExitStack

import pytest
from PySide6.QtWidgets import QFileDialog
from PySide6.QtCore import QDir
from PySide6.QtTest import QSignalSpy

from ui.tabs.input_tab import InputTab
from ui.widgets.file_view import FileView
from ui.dialogs import Notifications
from ui.lib import WidgetManager

@pytest.fixture
def input_tab_widget(app):
    settings = {"sorting_disabled": False}
    return InputTab(settings)

@pytest.fixture
def input_tab_patched(input_tab_widget):
    mock_file_dialog = MagicMock(spec=QFileDialog)
    mock_file_dialog.return_value.directory.return_value.absolutePath.return_value = "/tmp/path"
    mock_file_dialog.return_value.exec.return_value = True
    mock_file_dialog.return_value.selectedFiles.return_value = [
        "/tmp/image_0.jpg",
        "/tmp/image_1.jpg",
    ]

    mocks = {
        "file_view": patch.object(input_tab_widget, "file_view", MagicMock(spec=FileView)),
        "QFileDialog": patch("ui.tabs.input_tab.QFileDialog", return_value=mock_file_dialog),
        "_addItems": patch.object(input_tab_widget, "_addItems"),
        "FLATPAK": patch("ui.tabs.input_tab.FLATPAK", False),
        "wm": patch.object(input_tab_widget, "wm", MagicMock(spec=WidgetManager)),
        "wm.getVar": patch.object(input_tab_widget.wm, "getVar", return_value=None),
        "isPathValidStr": patch("ui.tabs.input_tab.isPathValidStr", return_value=True),
        "ALLOWED_INPUT_FILTERS": patch("ui.tabs.input_tab.ALLOWED_INPUT_FILTERS", "All Files (*)"),
        "scanDir": patch("ui.tabs.input_tab.scanDir"),
        "notify": patch.object(input_tab_widget, "notify", MagicMock(spec=Notifications)),
    }

    with ExitStack() as stack:
        _mocks = { name: stack.enter_context(patcher) for name, patcher in mocks.items() }
        yield input_tab_widget, _mocks

@pytest.fixture
def input_tab__addItems_patched(input_tab_widget):
    mocks = {
        "notify": patch.object(input_tab_widget, "notify", MagicMock(spec=Notifications)),
        "wm": patch.object(input_tab_widget, "wm", MagicMock(spec=WidgetManager)),
        "file_view": patch.object(input_tab_widget, "file_view", MagicMock(spec=FileView)),
        "ALLOWED_INPUT": patch("ui.tabs.input_tab.ALLOWED_INPUT", ["jpg", "png"]),
    }

    with ExitStack() as stack:
        _mocks = { name: stack.enter_context(patcher) for name, patcher in mocks.items() }
        yield input_tab_widget, _mocks

def test_init(input_tab_patched):
    input_tab, mocks = input_tab_patched
    assert input_tab.file_view
    assert input_tab.notify
    assert input_tab.wm

def test_getItems(input_tab_patched):
    input_tab, mocks = input_tab_patched
    input_tab.file_view.getItems()
    input_tab.file_view.getItems.assert_called_once()

def test_addFiles_selected_files(input_tab_patched):
    input_tab, mocks = input_tab_patched
    sample_files = [
        "/tmp/image_0.jpg",
        "/tmp/image_1.jpg",
    ]
    mocks["QFileDialog"].return_value.exec.return_value = True
    mocks["QFileDialog"].return_value.selectedFiles.return_value = sample_files

    input_tab.addFiles()

    input_tab._addItems.assert_called_once()
    for n, sample_file in enumerate(sample_files):
        assert input_tab._addItems.call_args[0][0][n][0] == Path(sample_file)
        assert input_tab._addItems.call_args[0][0][n][1] == Path(sample_file).parent

def test_addFiles_no_selected_files(input_tab_patched):
    input_tab, mocks = input_tab_patched
    mocks["QFileDialog"].return_value.exec.return_value = False
    input_tab.addFiles()
    input_tab._addItems.assert_not_called()

def test_addFiles_file_dlg_setup(input_tab_patched):
    input_tab, mocks = input_tab_patched
    input_tab.addFiles()
    mocks["QFileDialog"].assert_called_once_with(
        input_tab,
        "Add Images",
        ANY
    )
    mocks["QFileDialog"].return_value.setFileMode.assert_called_once_with(mocks["QFileDialog"].ExistingFiles)
    mocks["QFileDialog"].return_value.setNameFilters.assert_called_once_with(mocks["ALLOWED_INPUT_FILTERS"])

def test_addFiles_file_dlg_no_last_dir(input_tab_patched):
    input_tab, mocks = input_tab_patched
    input_tab.wm.getVar.return_value = None
    input_tab.addFiles()
    mocks["QFileDialog"].assert_called_once_with(
        input_tab,
        "Add Images",
        QDir.homePath()
    )

def test_addFiles_file_dlg_load_last_dir(input_tab_patched):
    input_tab, mocks = input_tab_patched
    last_dir = "/tmp"
    input_tab.wm.getVar.return_value = last_dir
    input_tab.addFiles()
    mocks["QFileDialog"].assert_called_once_with(
        input_tab,
        "Add Images",
        last_dir
    )

def test_addFiles_file_dlg_save_last_dir(input_tab_patched):
    input_tab, mocks = input_tab_patched
    used_dir = "/tmp"
    mocks["QFileDialog"].return_value.directory.return_value.absolutePath.return_value = used_dir
    input_tab.addFiles()
    input_tab.wm.setVar.assert_called_once_with("add_files_last_dir", used_dir)

def test_addFiles_files_selected(input_tab_patched):
    input_tab, mocks = input_tab_patched
    sample_files = [
        "/tmp/image_0.jpg",
        "/tmp/image_1.jpg",
    ]
    mocks["QFileDialog"].return_value.selectedFiles.return_value = sample_files
    input_tab.addFiles()
    for n, sample_file in enumerate(sample_files):
        assert input_tab._addItems.call_args[0][0][n][0] == Path(sample_file)
        assert input_tab._addItems.call_args[0][0][n][1] == Path(sample_file).parent

def test_addFiles_no_files_selected(input_tab_patched):
    input_tab, mocks = input_tab_patched
    mocks["QFileDialog"].return_value.exec.return_value = 0
    input_tab.addFiles()
    input_tab.wm.setVar.assert_not_called()

def test_addFiles_no_flatpak(input_tab_patched):
    input_tab, mocks = input_tab_patched
    with patch("ui.tabs.input_tab.FLATPAK", False):
        input_tab.addFiles()
        mocks["notify"].notify.assert_not_called()

def test_addFiles_flatpak_has_permission(input_tab_patched):
    input_tab, mocks = input_tab_patched
    mocks["QFileDialog"].return_value.selectedFiles.return_value = ["/tmp/image.jpg"]
    with patch("ui.tabs.input_tab.FLATPAK", True):
        input_tab.addFiles()
        mocks["notify"].notify.assert_not_called()

def test_addFiles_flatpak_no_permissions(input_tab_patched):
    input_tab, mocks = input_tab_patched
    mocks["QFileDialog"].return_value.selectedFiles.return_value = ["/run/user/1000/doc/123456789/Pictures/image.jpg"]
    with patch("ui.tabs.input_tab.FLATPAK", True):
        input_tab.addFiles()
        mocks["notify"].notify.assert_called_once()
        assert "Flatpak" in mocks["notify"].notify.call_args[0][0]
        assert "add filesystem permissions" in mocks["notify"].notify.call_args[0][1]

def test_addFiles_happy_path(input_tab_patched):
    input_tab, mocks = input_tab_patched
    sample_files = [
        "/tmp/image_0.jpg",
        "/tmp/image_1.jpg",
    ]
    used_dir = "/tmp"
    input_tab.wm.getVar.return_value = None
    mocks["QFileDialog"].return_value.exec.return_value = True
    mocks["QFileDialog"].return_value.directory.return_value.absolutePath.return_value = used_dir
    mocks["QFileDialog"].return_value.selectedFiles.return_value = sample_files

    input_tab.addFiles()

    mocks["QFileDialog"].assert_called_once_with(
        input_tab,
        "Add Images",
        QDir.homePath()
    )
    mocks["QFileDialog"].return_value.setFileMode.assert_called_once_with(mocks["QFileDialog"].ExistingFiles)
    mocks["QFileDialog"].return_value.setNameFilters.assert_called_once_with(mocks["ALLOWED_INPUT_FILTERS"])
    mocks["QFileDialog"].return_value.exec.assert_called_once()
    input_tab.wm.setVar.assert_called_once_with("add_files_last_dir", used_dir)
    for n, sample_file in enumerate(sample_files):
        assert input_tab._addItems.call_args[0][0][n][0] == Path(sample_file)
        assert input_tab._addItems.call_args[0][0][n][1] == Path(sample_file).parent

def test_addFolder_selected_folder(input_tab_patched):
    input_tab, mocks = input_tab_patched
    sample_folder = "/tmp/image_0.jpg"
    sample_files = [
        "/tmp/image_0.jpg",
        "/tmp/image_1.jpg",
    ]
    mocks["QFileDialog"].return_value.exec.return_value = True
    mocks["QFileDialog"].return_value.selectedFiles.return_value = [sample_folder]
    mocks["scanDir"].return_value = sample_files

    input_tab.addFolder()

    input_tab._addItems.assert_called_once()
    for n, sample_file in enumerate(sample_files):
        assert input_tab._addItems.call_args[0][0][n][0] == Path(sample_file)
        assert input_tab._addItems.call_args[0][0][n][1] == Path(sample_folder)

def test_addFolder_selected_folder_not_found(input_tab_patched):
    input_tab, mocks = input_tab_patched
    mocks["scanDir"].side_effect = FileNotFoundError()

    input_tab.addFolder()

    input_tab._addItems.assert_not_called()
    mocks["notify"].notify.assert_called_once()
    assert "Error" in mocks["notify"].notify.call_args[0][0]
    assert "not found" in mocks["notify"].notify.call_args[0][1]

def test_addFolder_empty_selection(input_tab_patched):
    input_tab, mocks = input_tab_patched
    mocks["QFileDialog"].return_value.exec.return_value = False
    input_tab.addFolder()
    input_tab._addItems.assert_not_called()

def test_addFolder_file_dlg_setup(input_tab_patched):
    input_tab, mocks = input_tab_patched
    input_tab.addFolder()
    mocks["QFileDialog"].assert_called_once_with(
        input_tab,
        "Add Images from a Folder",
        ANY
    )
    mocks["QFileDialog"].return_value.setFileMode.assert_called_once_with(mocks["QFileDialog"].Directory)

def test_addFolder_file_dlg_no_last_dir(input_tab_patched):
    input_tab, mocks = input_tab_patched
    input_tab.wm.getVar.return_value = None
    input_tab.addFolder()
    mocks["QFileDialog"].assert_called_once_with(
        input_tab,
        "Add Images from a Folder",
        QDir.homePath()
    )

def test_addFolder_file_dlg_load_last_dir(input_tab_patched):
    input_tab, mocks = input_tab_patched
    last_dir = "/tmp"
    input_tab.wm.getVar.return_value = last_dir
    input_tab.addFolder()
    mocks["QFileDialog"].assert_called_once_with(
        input_tab,
        "Add Images from a Folder",
        last_dir
    )

def test_addFolder_file_dlg_save_last_dir(input_tab_patched):
    input_tab, mocks = input_tab_patched
    used_dir = "/tmp"
    mocks["QFileDialog"].return_value.directory.return_value.absolutePath.return_value = used_dir
    input_tab.addFolder()
    input_tab.wm.setVar.assert_called_once_with("add_folder_last_dir", used_dir)

def test_addFiles_happy_path(input_tab_patched):
    input_tab, mocks = input_tab_patched
    sample_files = [
        "/tmp/image_0.jpg",
        "/tmp/image_1.jpg",
    ]
    used_dir = "/tmp"
    sample_folder = "/tmp/image_0.jpg"
    
    input_tab.wm.getVar.return_value = None
    mocks["QFileDialog"].return_value.exec.return_value = True
    mocks["QFileDialog"].return_value.directory.return_value.absolutePath.return_value = used_dir
    mocks["QFileDialog"].return_value.selectedFiles.return_value = [sample_folder]
    mocks["scanDir"].return_value = sample_files

    input_tab.addFolder()

    mocks["QFileDialog"].assert_called_once_with(
        input_tab,
        "Add Images from a Folder",
        QDir.homePath()
    )
    mocks["QFileDialog"].return_value.setFileMode.assert_called_once_with(mocks["QFileDialog"].Directory)
    mocks["QFileDialog"].return_value.exec.assert_called_once()
    input_tab.wm.setVar.assert_called_once_with("add_folder_last_dir", used_dir)
    for n, sample_file in enumerate(sample_files):
        assert input_tab._addItems.call_args[0][0][n][0] == Path(sample_file)
        assert input_tab._addItems.call_args[0][0][n][1] == Path(sample_folder)

def test_clearInput(input_tab_patched):
    input_tab, mocks = input_tab_patched
    input_tab.clearInput()
    input_tab.file_view.clear.assert_called_once()

def test_disableSorting(input_tab_patched):
    input_tab, mocks = input_tab_patched
    input_tab.disableSorting(True)
    input_tab.file_view.disableSorting.assert_called_once_with(True)

def test_saveState(input_tab_patched):
    input_tab, mocks = input_tab_patched
    input_tab.saveState()
    input_tab.wm.saveState.assert_called_once()

def test__addItems_no_items(input_tab__addItems_patched):
    input_tab, mocks = input_tab__addItems_patched
    input_tab._addItems([])
    input_tab.file_view.assert_not_called()

def test__addItems_items(input_tab__addItems_patched):
    input_tab, mocks = input_tab__addItems_patched
    sample_files = [
        (Path("/tmp/Pictures/image_0.jpg"), Path("/tmp/Pictures")),
        (Path("/tmp/Pictures/image_1.jpg"), Path("/tmp/Pictures")),
    ]
    
    input_tab._addItems(sample_files)

    input_tab.file_view.startAddingItems.assert_called_once()
    for n, sample_file in enumerate(sample_files):
        assert input_tab.file_view.addItems.call_args[0][0][n] == (
            sample_file[0].stem,
            sample_file[0].suffix[1:],
            str(sample_file[0]),
            sample_file[1],
        )
    input_tab.file_view.finishAddingItems.assert_called_once()
    
def test_convert_signal(input_tab_patched):
    input_tab, mocks = input_tab_patched
    spy = QSignalSpy(input_tab.convert)
    input_tab.convert_btn.click()
    assert spy.count() == 1
from pathlib import Path
import logging
from typing import List, Tuple
import os

from PySide6.QtWidgets import(
    QWidget,
    QGridLayout,
    QPushButton,
    QFileDialog
)
from PySide6.QtCore import(
    Signal,
    QUrl,
    QDir,
)
from PySide6.QtGui import(
    QShortcut,
    QKeySequence,
)

from data.constants import ALLOWED_INPUT, ALLOWED_INPUT_FILTERS, FLATPAK
from core.utils import scanDir
from ui.dialogs import Notifications
from ui.widgets import FileView
from ui.lib import WidgetManager
from ui.lib.utils import isPathValidStr

class InputTab(QWidget):
    convert = Signal()

    def __init__(self, settings):
        super(InputTab, self).__init__()
        self.notify = Notifications(self)
        self.wm = WidgetManager("InputTab")
        
        self._setupWidgets()
        self._setupLayouts()
        self._setupSignals()
        self._setupShortcuts()

        self.disableSorting(settings["sorting_disabled"])
        self.wm.loadState()

    # --------------------------------------
    #               UI Setup
    # --------------------------------------

    def _setupWidgets(self):
        self.file_view = FileView(self)
        self.add_files_btn = QPushButton(self)
        self.add_files_btn.setText("Add Files")
        self.add_folder_btn = QPushButton(self)
        self.add_folder_btn.setText("Add Folder")
        self.clear_list_btn = QPushButton(self)
        self.clear_list_btn.setText("Clear List")
        self.convert_btn = QPushButton(self)
        self.convert_btn.setText("Convert")

    def _setupLayouts(self):
        input_l = QGridLayout()
        self.setLayout(input_l)

        input_l.addWidget(self.add_files_btn,  1, 0)
        input_l.addWidget(self.add_folder_btn, 1, 1)
        input_l.addWidget(self.clear_list_btn, 1, 2)
        input_l.addWidget(self.convert_btn,    1, 3, 1, 2)
        input_l.addWidget(self.file_view,      0, 0, 1, 0)

    def _setupShortcuts(self):
        self.select_all_sc = QShortcut(QKeySequence('Ctrl+A'), self)
        self.delete_all_sc = QShortcut(QKeySequence("Ctrl+Shift+X"), self)
        self.select_all_sc.activated.connect(self.file_view.selectAllItems)
        self.delete_all_sc.activated.connect(self.file_view.clear)

    def _setupSignals(self):
        self.add_files_btn.clicked.connect(self.addFiles)
        self.add_folder_btn.clicked.connect(self.addFolder)
        self.clear_list_btn.clicked.connect(self.clearInput)
        self.convert_btn.clicked.connect(self.convert.emit)

    # --------------------------------------
    #                Public
    # --------------------------------------

    def getItems(self):
        return self.file_view.getItems()

    def addFiles(self):
        # Load last used dir
        dir_to_load = self.wm.getVar("add_files_last_dir")
        if dir_to_load is None or not isPathValidStr(dir_to_load):
            dir_to_load = QDir.homePath()

        # Dialog
        dlg = QFileDialog(
            self,
            "Add Images",
            dir_to_load,
        )
        dlg.setFileMode(QFileDialog.ExistingFiles)
        dlg.setNameFilters(ALLOWED_INPUT_FILTERS)

        if not dlg.exec():
            return
        
        self.wm.setVar("add_files_last_dir", dlg.directory().absolutePath())

        # Add items
        file_paths = []
        for i in dlg.selectedFiles():
            file_paths.append(
                (
                    Path(i),
                    Path(i).parent,
                )
            )
        
        if FLATPAK and len(file_paths) > 0 and str(file_paths[0][0]).startswith("/run"):
            self.notify.notify("Flatpak Limitation Notice", "To use this feature, add filesystem permissions to the source directory or volume.\nDirectory context is required to manage outputs.")
            return

        self._addItems(file_paths)

    def addFolder(self):
        dir_to_load = self.wm.getVar("add_folder_last_dir")
        if dir_to_load is None or not isPathValidStr(dir_to_load):
            dir_to_load = QDir.homePath()

        dlg = QFileDialog(
            self,
            "Add Images from a Folder",
            dir_to_load
        )
        dlg.setFileMode(QFileDialog.Directory)

        if not dlg.exec():
            return

        self.wm.setVar("add_folder_last_dir", dlg.directory().absolutePath())
        selected_dir = dlg.selectedFiles()[0]
        
        try:
            file_paths = scanDir(selected_dir)
        except FileNotFoundError:
            self.notify.notify("Error", "The directory was not found.")
            return

        # Add items
        tmp = []
        for i in file_paths:
            tmp.append(
                (
                    Path(i),
                    Path(selected_dir),
                )
            )
        self._addItems(tmp)
    
    def clearInput(self):
        self.file_view.clear()
    
    def disableSorting(self, disabled):
        self.file_view.disableSorting(disabled)
    
    def saveState(self):
        self.wm.saveState()

    # --------------------------------------
    #                Private
    # --------------------------------------

    def _addItems(self, items: List[Tuple[Path, Path]]) -> None:
        """
        Adds items to the file list.
        
        Args:
            items: List
                Tuple:
                    absolute_path: Path
                    anchor path: Path
                ...
        """ 
        if not items:
            return
        
        tmp = []
        for abs_path, anchor_path in items:
            ext = abs_path.suffix[1:]

            if ext.lower() in ALLOWED_INPUT:
                tmp.append(
                    (
                        abs_path.stem,
                        ext,
                        str(abs_path),
                        anchor_path,
                    )
                )
        
        self.file_view.startAddingItems()
        self.file_view.addItems(tmp)
        self.file_view.finishAddingItems()
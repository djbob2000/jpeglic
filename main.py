#!/usr/bin/python3

import sys
import os
import logging

from PySide6.QtWidgets import (
    QApplication,
    QMainWindow,
    QTabWidget,
)
from PySide6.QtCore import (
    QThreadPool,
    Signal,
)
from PySide6.QtGui import (
    QIcon,
    QShortcut,
    QKeySequence,
)

from data.constants import (
    ICON_SVG,
)
from ui import (
    InputTab,
    AboutTab,
    ModifyTab,
    OutputTab,
    SettingsTab,
    Notifications,
    ProgressDialog,
    ExceptionView,
)

from core.utils import clip
from data import fonts
import data.task_status as task_status
from data.sounds import finished_sound
from data.logging_manager import LoggingManager
from data.process_manager import ProcessManager
from core.controller import Controller, CheckFlags

class MainWindow(QMainWindow):
    moved = Signal()

    def __init__(self):
        super().__init__()
        self.setupWindow()
        
        LoggingManager()    # init singleton
        self.threadpool = QThreadPool.globalInstance()
        self.controller = Controller(self.threadpool)

        self.setupWidgets()        
        self.setupSignals()
        self.setupMisc()

    def setupWindow(self) -> None:
        self.setWindowTitle("XL Converter")
        self.setWindowIcon(QIcon(ICON_SVG))
        self.setAcceptDrops(True)
        self.resize(700, 352)

    def setupWidgets(self) -> None:
        self.tabs = QTabWidget(self)
        self.tabs.setFont(fonts.MAIN_TABS)
        self.settings_tab = SettingsTab()
        settings = self.settings_tab.getSettings()
        self.input_tab = InputTab(settings)
        self.output_tab = OutputTab(self.threadpool.maxThreadCount(), settings)
        self.modify_tab = ModifyTab(settings)
        self.about_tab = AboutTab()

        self.exception_view = ExceptionView(settings, parent=self)
        self.notifications = Notifications(self)
        self.progress_dlg = ProgressDialog(parent=self, title="Converting...", cancelable=True)

        self.tabs.addTab(self.input_tab, "Input")
        self.tabs.addTab(self.output_tab, "Output")
        self.tabs.addTab(self.modify_tab, "Modify")
        self.tabs.addTab(self.settings_tab, "Settings")
        self.tabs.addTab(self.about_tab, "About")

        self.setCentralWidget(self.tabs)

        MAX_WIDTH = 825
        MAX_HEIGHT = 320
        self.output_tab.setMaximumSize(MAX_WIDTH, MAX_HEIGHT)
        self.modify_tab.setMaximumSize(MAX_WIDTH, MAX_HEIGHT)

        self.tabs.setStyleSheet("""
            QTabBar::tab { margin-right: 10px; }
            QTabBar::tab:first { margin-left: 12px; }
        """)

    def setupSignals(self) -> None:
        self.controller.update_progress_line1.connect(self.progress_dlg.setLabelTextLine1)
        self.controller.update_progress_line2.connect(self.progress_dlg.setLabelTextLine2)
        self.controller.update_progress_value.connect(self.progress_dlg.setValue)
        self.controller.exception.connect(self.exception_view.addItem)
        self.controller.processing_finished.connect(self.finishProcessing)
        self.controller.processing_started.connect(self.startProcessing)

        self.progress_dlg.canceled.connect(self.controller.cancel)
        self.moved.connect(self.progress_dlg.updatePosition)
        
        self.input_tab.convert.connect(self.convert)
        self.output_tab.convert.connect(self.convert)
        self.modify_tab.convert.connect(self.convert)
        self.settings_tab.signals.disable_sorting.connect(self.input_tab.disableSorting)
        self.settings_tab.signals.enable_jxl_effort_10.connect(self.output_tab.setJxlEffort10Enabled)
        self.settings_tab.signals.custom_resampling.connect(self.modify_tab.toggleCustomResampling)
        self.settings_tab.signals.enable_quality_prec_snap.connect(self.output_tab.enableQualityPrecisionSnapping)
        self.settings_tab.signals.change_jpg_encoder.connect(self.output_tab.onJPGEncoderChanged)

    def setupMisc(self) -> None:
        select_tab_sc = []
        for i in range(clip(self.tabs.count(), 0, 9)):
            select_tab_sc.append(QShortcut(QKeySequence(f"Alt+{i+1}"), self))
            select_tab_sc[i].activated.connect(lambda i=i: self.tabs.setCurrentIndex(i))

    def startProcessing(self) -> None:
        self.setUIEnabled(False)
        self.progress_dlg.setRange(0, self.controller.getItemCount())
        self.progress_dlg.show()

    def finishProcessing(self) -> None:
        settings = self.settings_tab.getSettings()
        self.progress_dlg.finished()

        if settings["play_sound_on_finish"]:
            finished_sound.play(volume=settings["play_sound_on_finish_vol"])

        if not self.exception_view.isEmpty() and not settings["no_exceptions"] and not task_status.wasCanceled():
            self.exception_view.resizeToContent()
            self.exception_view.show()
        
        if self.output_tab.isClearAfterConvChecked():
            self.input_tab.clearInput()

        self.setUIEnabled(True)

    def convert(self):
        output_tab_settings = self.output_tab.getSettings()
        modify_tab_settings = self.modify_tab.getSettings()
        settings_tab_settings = self.settings_tab.getSettings()

        self.controller.parseData(self.input_tab.getItems())
        
        check_status = self.controller.checkProcessingRequirements(
            self.input_tab.file_view.topLevelItemCount(),
            self.output_tab.smIsFormatPoolEmpty(),
            output_tab_settings,
            modify_tab_settings,
        )

        if check_status.display_error:
            self.notifications.notify(check_status.error_title, check_status.error_description)

        if CheckFlags.DISABLE_DOWNSCALING in check_status.flags:
            self.modify_tab.disableDownscaling()
            modify_tab_settings = self.modify_tab.getSettings()

        if not check_status.allowed_to_proceed:
            return
        
        self.exception_view.reset()
        self.settings_tab.saveState(settings_tab_settings)
        self.output_tab.saveState(output_tab_settings)
        self.modify_tab.saveState(modify_tab_settings)

        self.controller.startProcessing(
            output_tab_settings,
            modify_tab_settings,
            settings_tab_settings,
            self.output_tab.getUsedThreadCount(),
        )

    def setUIEnabled(self, enabled: bool) -> None:
        self.tabs.setEnabled(enabled)
    
    def isUIEnabled(self) -> bool:
        return self.tabs.isEnabled()
    
    # Events
    def closeEvent(self, e):
        self.settings_tab.saveState()
        self.output_tab.saveState()
        self.modify_tab.saveState()
        if self.threadpool.activeThreadCount() > 0:
            ProcessManager.terminateAll()
        super().closeEvent(e)
    
    def dragEnterEvent(self, e):
        if self.isUIEnabled() and e.mimeData().hasUrls():
            e.accept()
        else:
            e.ignore()

    def dropEvent(self, e):
        if e.mimeData().hasUrls():
            e.accept()
            self.tabs.setCurrentIndex(0)
            self.input_tab.file_view.dropEvent(e)
        else:
            e.ignore()
    
    def moveEvent(self, e):
        super().moveEvent(e)
        self.moved.emit()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    main_window = MainWindow()
    
    fonts.loadFonts()
    app.setFont(fonts.DEFAULT)
    
    main_window.show()
    sys.exit(app.exec())
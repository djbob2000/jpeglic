import logging
import textwrap
import os
from typing import Dict, Any, Tuple, Union, List
from pathlib import Path

from PySide6.QtCore import (
    QThreadPool,
    QMutex,
    Signal,
    Slot,
    QObject,
)

from data.time_left import TimeLeft
from data.thread_manager import ThreadManager
from data.items import Items
import data.task_status as task_status
from core.worker import Worker

class Controller(QObject):
    processing_started = Signal()
    processing_finished = Signal()      # finished / canceled
    exception = Signal(str, str, str)
    update_progress_line1 = Signal(str)
    update_progress_line2 = Signal(str)
    update_progress_value = Signal(int)

    def __init__(self, threadpool: QThreadPool) -> None:
        super().__init__()
        # Components
        self.threadpool = threadpool
        self.time_left = TimeLeft()
        self.thread_manager = ThreadManager(self.threadpool)
        self.items = Items()

        # Flags
        self.finish_emitted = False     # debounce

        # Signals
        self.time_left.update_time_left.connect(self.update_progress_line2)

    def checkProcessingRequirements(self,
        input_tab_item_count: int,
        sm_is_format_pool_empty: bool,
        output_tab_settings: dict[str, Any],
        modify_tab_settings: dict[str, Any],
    ) -> Dict[str, Union[str, bool, List]]:
        """Performs pre-conversion checks. Remember to parse data before."""
        output = {
            "display_error": False,
            "error_title": "",
            "error_dsc": "",
            "allowed_to_proceed": True,
            "flags": [],    # Possible: "disable_downscaling"
        }

        if input_tab_item_count == 0:
            output.update({
                "allowed_to_proceed": False,
                "display_error": True,
                "error_title": "Empty List",
                "error_dsc": "File list is empty.\nDrag and drop images (or folders) onto the program to add them."
            })
            return output

        if output_tab_settings["custom_output_dir"]:
            custom_dir_path = Path(output_tab_settings["custom_output_dir_path"]) 
            if custom_dir_path.is_absolute(): # Relative paths are handled in the Worker
                try:
                    os.makedirs(custom_dir_path, exist_ok=True)
                except OSError as err:
                    output.update({
                        "allowed_to_proceed": False,
                        "display_error": True,
                        "error_title": "Access Error",
                        "error_dsc": f"Make sure the output path is accessible\nand you have write permissions to it.\n{textwrap.fill(str(err), width=75)}"
                    })
                    return output
            else:
                if output_tab_settings["keep_dir_struct"]:
                    output.update({
                        "allowed_to_proceed": False,
                        "display_error": True,
                        "error_title": "Path Conflict",
                        "error_dsc": "A relative path cannot be combined with \"Keep Folder Structure\".\nEnter an absolute path (or choose one by clicking on the button with 3 dots)."
                    })
                    return output

        if output_tab_settings["format"] == "Smallest Lossless" and sm_is_format_pool_empty:
            output.update({
                "allowed_to_proceed": False,
                "display_error": True,
                "error_title": "Format Error",
                "error_dsc": "Select at least one format."
            })
            return output

        if (
            modify_tab_settings["downscaling"]["enabled"] and
            output_tab_settings["format"] in ("Smallest Lossless", "Lossless JPEG Transcoding", "JPEG Reconstruction")
        ):
            output.update({
                "display_error": True,
                "error_title": "Downscaling Disabled",
                "error_dsc": f"Downscaling was set to disabled,\nbecause it's not available for {output_tab_settings['format']}."
            })
            output["flags"].extend([ "disable_downscaling" ])
            return output

        if self.items.getItemCount() == 0:
            output.update({
                "allowed_to_proceed": False,
                "display_error": True,
                "error_title": "Data Error",
                "error_dsc": "Something went wrong.\nParsed data is empty"
            })
            return output

        return output

    def parseData(self, input_tab_items) -> None:
        """Prepares data for startProcessing(...)"""
        self.items.clear()
        self.items.parseData(*input_tab_items)

    def startProcessing(self,
        output_tab_settings: dict[str, Any],
        modify_tab_settings: dict[str, Any],
        settings_tab_settings: dict[str, Any],
        used_thread_count: int,
    ) -> None:
        """Starts the conversion."""
        
        # Setup
        enable_parallel = self.thread_manager.isParallelRecommended(
            output_tab_settings["format"],
            settings_tab_settings['jxl_disable_parallel'],
            output_tab_settings['effort'],
            output_tab_settings['jxl_modular'],
            output_tab_settings['lossless'],
            output_tab_settings['intelligent_effort'],
        )
        self.thread_manager.configure(
            output_tab_settings["format"],
            self.items.getItemCount(),
            used_thread_count,
            enable_parallel,
        )
        task_status.reset()
        self.finish_emitted = False

        # Start
        for i in range(self.items.getItemCount()):
            abs_path, anchor_path = self.items.getItem(i)
            worker = Worker(
                i,
                abs_path,
                anchor_path,
                output_tab_settings | modify_tab_settings,
                settings_tab_settings,
                self.thread_manager.getAvailableThreads(i),
                QMutex()
            )
            worker.signals.started.connect(self.workerStarted)
            worker.signals.completed.connect(self.workerCompleted)
            worker.signals.canceled.connect(self.workerCanceled)
            worker.signals.exception.connect(self.exception)
            self.threadpool.start(worker)
        
        self.time_left.startCounting(self.items.getItemCount())
        self.processing_started.emit()
        self.update_progress_line1.emit(f"Converted 0 out of {self.items.getItemCount()} images")   # Needs to stay after processing_started.emit()

    def finishProcessing(self) -> None:
        if self.finish_emitted:
            return
        self.time_left.stopCounting()
        self.processing_finished.emit()
        self.finish_emitted = True

    def getItemCount(self) -> int:
        return self.items.getItemCount()
   
    def getCompletedItemCount(self) -> int:
        return self.items.getCompletedItemCount()

    @Slot(int)
    def workerStarted(self, n: int) -> None:
        logging.debug(f"[Worker #{n}] Started")

    @Slot(int)
    def workerCompleted(self, n: int) -> None:
        self.items.addCompletedItem()
        self.time_left.addCompletedItem()
        self.update_progress_line1.emit(f"Converted {self.items.getCompletedItemCount()} out of {self.items.getItemCount()} images")
        self.update_progress_value.emit(self.items.getCompletedItemCount())

        if self.items.getCompletedItemCount() >= self.items.getItemCount():
            self.finishProcessing()
        
        logging.debug(f"Active Workers: {self.threadpool.activeThreadCount()}")
        logging.debug(f"[Worker #{n}] Completed")

    @Slot(int)
    def workerCanceled(self, n: int) -> None:
        self.finishProcessing()
        logging.debug(f"[Worker #{n}] Canceled")

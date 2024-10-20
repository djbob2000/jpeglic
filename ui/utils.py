import os
import platform
import logging
from contextlib import contextmanager
import traceback

from PySide6.QtWidgets import QWidget, QHBoxLayout
from PySide6.QtCore import QUrl
from PySide6.QtGui import QDesktopServices

from core.process import runProcess

def setToolTip(tooltip: str, *widget_ids: QWidget) -> None:
    for widget in widget_ids:
        try:
            widget.setToolTip(tooltip)
        except Exception as e:
            logging.error(f"[ui.utils.setToolTip] Failed to apply tooltip. {e}")

@contextmanager
def _sanitizeEnviron() -> dict[str, str]:
    """Sanitizes os.environ as a context manager."""
    keys_to_sanitize = [
        "LD_LIBRARY_PATH",
        "QT_PLUGIN_PATH",
        "QT_QPA_PLATFORM_PLUGIN_PATH",
        "QML2_IMPORT_PATH",
    ]
    backup = {}

    try:
        for key in keys_to_sanitize:
            value = os.environ.get(key, None)
            if value is None:
                continue
            backup[key] = value
            del os.environ[key]
        yield
    finally:
        for key, value in backup.items():
            os.environ[key] = value

def openRemoteUrl(url: str) -> None:
    """Opens a webpage in the default web browser."""
    openUrl(QUrl(url))

def openLocalUrl(url: str) -> None:
    """Opens a local file or directory in the default application."""
    openUrl(QUrl.fromLocalFile(url))

def openUrl(qurl: QUrl) -> None:
    try:
        if platform.system() == "Linux":
            with _sanitizeEnviron():
                QDesktopServices.openUrl(qurl)
        else:
            QDesktopServices.openUrl(qurl)
    except Exception as e:
        logging.error(f"[ui.utils.openUrl] Failed to open URL. {e}")

def isPathValidStr(path: str) -> bool:
    """Checks if a given path is valid and accessible for R/W."""
    if (
        type(path) is str and
        os.access(path, os.R_OK | os.W_OK)
    ):
        return True
    return False

def createQHBoxLayout(*widgets: QWidget) -> QHBoxLayout:
    """Returns a QHBoxLayout containing the specified widgets.
    
    Skips invalid types. Returns an empty QHboxLayout if no argument is valid."""
    layout = QHBoxLayout()
    for widget in widgets:
        if not isinstance(widget, QWidget):
            caller_frame = traceback.extract_stack()[-2]
            logging.error(f"[ui.utils.createQHBoxLayout] Type mismatch. Expected QWidget, got {type(widget)}.\n\tCaller: {caller_frame.filename}:{caller_frame.lineno}")
            continue

        try:
            layout.addWidget(widget)
        except Exception as e:
            caller_frame = traceback.extract_stack()[-2]
            logging.error(f"[ui.utils.createQHBoxLayout] Failed to add a widget.\n\t{e}\n\tCaller: {caller_frame.filename}:{caller_frame.lineno}")
    
    return layout
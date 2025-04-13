import re

import requests
from PySide6.QtCore import(
    QObject,
    Signal,
    QThread,
)

from data.constants import UPDATE_CHECKER_VER_FILE_URL, VERSION

# Debug
SIMULATE_SERVER = True
SIMULATE_SERVER_JSON = {
    "latest_version": VERSION,
    "download_url": "https://codepoems.eu/xl-converter",
    "message": "",
    "message_url": ""
}

class UpdateCheckerWorker(QObject):
    json_received = Signal(dict)
    error_occurred = Signal(str)
    finished = Signal()

    def run(self) -> dict:
        if SIMULATE_SERVER:
            self.json_received.emit(SIMULATE_SERVER_JSON)
            self.finished.emit()
            return
        
        try:
            response = requests.get(UPDATE_CHECKER_VER_FILE_URL, timeout=5)
            response.raise_for_status()
            self.json_received.emit(response.json())
        except requests.exceptions.RequestException as e:
            self.error_occurred.emit(str(e))
        finally:
            self.finished.emit()

class UpdateCheckerRunner(QObject):
    json_received = Signal(dict)
    error_occurred = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.worker = None
        self.thread = None
    
    def _cleanup(self):
        if self.thread:
            self.thread.quit()
            self.thread.wait(1000)
            self.thread.deleteLater()
            self.thread = None
        
        if self.worker:
            self.worker.deleteLater()
            self.worker = None
        
    def run(self):
        if self.thread and self.thread.isRunning():
            return

        self.worker = UpdateCheckerWorker()
        self.thread = QThread()

        self.worker.moveToThread(self.thread)
        self.thread.started.connect(self.worker.run)
        self.worker.json_received.connect(self.json_received)
        self.worker.error_occurred.connect(self.error_occurred)
        self.thread.start()
        self.worker.finished.connect(self._cleanup)

def isVersionNewer(current_ver: str, remote_ver: str) -> bool:
    """
    Parses and compares two semver strings.
    
    Returns:
        True - if remote_ver is newer than current_ver or cannot be parsed.
        False - if remote_ver is older or identical to current_ver. 
    """
    pattern = r"(\d+)\.(\d+)\.(\d+)"
    current_ver_match = re.fullmatch(pattern, current_ver)
    remote_ver_match = re.fullmatch(pattern, remote_ver)

    if not current_ver or not remote_ver:
        return True
    
    current_parts = tuple(int(x) for x in current_ver_match.groups())
    remote_parts = tuple(int(x) for x in remote_ver_match.groups())

    return remote_parts > current_parts     # Compared lexicographically
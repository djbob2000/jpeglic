from PySide6.QtWidgets import(
    QDialog,
    QPushButton,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QSizePolicy,
)
from PySide6.QtCore import(
    Qt,
    QUrl,
    QObject,
    Signal,
)
from PySide6.QtGui import(
    QGuiApplication,
    QIcon,
)

from data.constants import VERSION, ICON_SVG, FLATPAK
from core.update_checker import isNewerVersionAvailable, UpdateCheckerRunner, UpdateInfo
from ui.lib.utils import openRemoteUrl

class Dialog(QDialog):
    """The update checker dialog for internal use by the UpdateChecker class."""
    closed = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)

        # UI setup
        self._setupWidgets()
        self._setupLayout()
        self._setupSignals()

        # Vars
        self.link_btn_url = None

    def _setupWidgets(self):
        self.text_l = QLabel("Placeholder", self)
        self.ok_btn = QPushButton("Ok", self)
        self.link_btn = QPushButton("Read More", self)

    def _setupLayout(self):
        self.setWindowTitle("Update Checker")
        self.setWindowIcon(QIcon(ICON_SVG))
        self.setMinimumSize(280, 100)

        self.text_l.setAlignment(Qt.AlignCenter)
        self.text_l.setWordWrap(True)
        self.link_btn.setMinimumWidth(100)
        self.ok_btn.setMinimumWidth(100)

        self.buttons_hb = QHBoxLayout()
        self.buttons_hb.addWidget(self.link_btn)
        self.buttons_hb.addWidget(self.ok_btn)
        self.buttons_hb.setAlignment(Qt.AlignRight)

        self.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Minimum)
        self.main_lt = QVBoxLayout()
        self.setLayout(self.main_lt)
        self.main_lt.addWidget(self.text_l)
        self.main_lt.addLayout(self.buttons_hb)

    def _setupSignals(self):
        self.ok_btn.clicked.connect(self.close)
        self.link_btn.clicked.connect(self._onLinkBtnPress)

    def resizeToContent(self):
        """Resize to content and center."""
        self.setMinimumSize(self.main_lt.sizeHint())
        qr = self.frameGeometry()           
        cp = QGuiApplication.primaryScreen().availableGeometry().center()
        qr.moveCenter(cp)
        self.move(qr.topLeft())

    def _onLinkBtnPress(self):
        if self.link_btn_url is None:
            return
        openRemoteUrl(self.link_btn_url)
        self.close()

    def show(
        self,
        message: str,
        url: str | None = None,
        url_text: str | None = None,
        resize_to_content: bool = False
    ):
        """Shows a modal dialog."""
        self.text_l.setText(message)
        if url:
            self.link_btn.setText(url_text if url_text else "Open Link")
            self.link_btn_url = url

        self.link_btn.setVisible(bool(url))

        if resize_to_content:
            self.resizeToContent()
        
        super().show()

    def reject(self):
        super().reject()
        self.closed.emit()

    def accept(self):
        super().accept()
        self.closed.emit()

class UpdateChecker(QObject):
    """The public class for interactive with the update checker."""
    finished = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent = parent
        
        # Vars
        self.dlg = None
        self.runner = None
        self.update_info = None
        
        # Settings
        self.prompt_on_update_only = False

        # Flags
        self.initialized = False
        self.message_viewed = False

    def _lazyInit(self):
        self.initialized = True
        self.dlg = Dialog(parent=self.parent)
        self.dlg.closed.connect(self._onDialogClosed)
        self.runner = UpdateCheckerRunner()
        self.runner.json_received.connect(self._jsonReceived)
        self.runner.error_occurred.connect(self._errorOccurred)

    def _errorOccurred(self, error: str) -> None:
        if self.prompt_on_update_only:
            return
        
        self.dlg.show(error)

    def _onDialogClosed(self) -> None:
        if not self.update_info:    # _errorOccurred
            self.finished.emit()
            return

        if self.update_info.message and not self.message_viewed:
            self.dlg.show(
                self.update_info.message,
                self.update_info.message_url or None,
                "Read More",
            )
            self.message_viewed = True
        else:
            self.finished.emit()

    def _jsonReceived(self, update_data: dict) -> None:
        try:
            self.update_info = UpdateInfo.fromJson(update_data)
            is_new_ver_available = isNewerVersionAvailable(self.update_info.latest_version)
        except Exception as e:
            if not self.prompt_on_update_only:
                self.dlg.show(str(e))
            return
        
        if is_new_ver_available:
            if FLATPAK:
                self.dlg.show(f"New version is available ({self.update_info.latest_version}).")
            else:
                self.dlg.show(
                    f"New version is available ({self.update_info.latest_version}).",
                    self.update_info.download_url or None,
                    "Download"
                )
        elif not self.prompt_on_update_only:
            self.dlg.show("This version is up to date.")

    def run(self, silent: bool = False) -> None:
        if not self.initialized:
            self._lazyInit()

        self.update_info = None
        self.message_viewed = False

        self.runner.run()

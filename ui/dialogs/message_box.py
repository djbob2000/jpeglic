from PySide6.QtWidgets import(
    QMessageBox,
    QWidget,
)
from PySide6.QtGui import(
    QIcon
)

from data.constants import ICON_SVG

def _displayMessageBox(
    parent: QWidget,
    title: str,
    text: str,
    detailed_text: str | None = None,
    buttons: QMessageBox.StandardButton = QMessageBox.StandardButton.Ok,
) -> int:
    dlg = QMessageBox(parent)
    dlg.setWindowIcon(QIcon(ICON_SVG))
    dlg.setWindowTitle(title)
    dlg.setText(text)
    dlg.setDetailedText(detailed_text)

    result = dlg.exec()

    dlg.deleteLater()

    return result

def info(
    parent: QWidget,
    title: str,
    text: str,
    detailed_text: str | None = None,
) -> None:
    """Displays a message box with an "Ok" button."""
    _displayMessageBox(
        parent,
        title,
        text,
        detailed_text,
        QMessageBox.StandardButton.Ok
    )
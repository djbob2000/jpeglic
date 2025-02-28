import logging

from PySide6.QtWidgets import QApplication

from ui.label import StyledLabel
from .stylesheet import getStyleSheet
from .themes import getTheme

def setTheme(theme_name: str = "Ralsei") -> None:
    """Sets theme of the QApplication."""
    theme = getTheme(theme_name)
    stylesheet = getStyleSheet(theme)

    app = QApplication.instance()
    if app is None:
        logging.getLogger(__name__).error("QApplication not found.")
        return

    app.setStyle("Fusion")  # Solves a lot of crossplatform issues. A common baseline.
    app.setStyleSheet(stylesheet)
    # Workaround for limited styling support in QSS.
    StyledLabel.updateStyleForAll(f"""
    a {{
        color: {theme.colors.accent_big};
        text-decoration: none;
    }}
    """)
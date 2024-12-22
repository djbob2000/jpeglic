import logging
from pathlib import Path

from PySide6.QtGui import (
    QFont,
    QFontDatabase,
)

from data.constants import ASSETS_FONTS_DIR

# Load fonts
fonts = [
    # For easily adding fonts:
    # ls -1 | sed 's/^.*/"&",/'

    # font-weight reference:
    # Light: 300
    # Regular: 400
    # Medium: 500
    # SemiBold: 600
    # Bold: 700

    "OpenSans-Light.ttf",
    "OpenSans-Regular.ttf",
    "OpenSans-Medium.ttf",
    "OpenSans-Bold.ttf",
    "OpenSans-SemiBold.ttf",
]

def init():
    """Run after initializing QApplication."""
    for font in fonts:
        font_id = QFontDatabase.addApplicationFont(str(Path(ASSETS_FONTS_DIR, font)))
        if font_id == -1:
            logging.error(f"[Fonts] Failed to load {font}")
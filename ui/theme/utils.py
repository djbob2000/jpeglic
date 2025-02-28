import logging
from pathlib import Path

import data.constants as constants

def hexToRGBA(hex_color: str, alpha: int = 255) -> None:
    """
    Converts a hexadecimal color to RGB with alpha.

    Args:
        hex_color: hexadecimal color (example: #111111).
        alpha: opacity. Range: 0 - 255.

    Raises:
        ValueError: if hex_color is invalid
    """
    hex_color = hex_color.lstrip("#")

    if len(hex_color) != 6:
        raise ValueError("Invalid hex_color length.")

    int(hex_color, 16)  # Raises ValueError if invalid hex number

    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    
    return f"rgba({r}, {g}, {b}, {alpha})"

def getIconPath(icon_name: str) -> str:
    """Returns paths to the icon. If file not found, logs an error."""
    path = Path(constants.ASSETS_ICONS_DIR, icon_name)
    if not path.is_file():
        logging.error(f"[ui.theme] Cannot find icon: {path}")
        return ""

    return path.as_posix()      # Must be `as_posix()`, otherwise the stylesheet will fail to parse on Windows.
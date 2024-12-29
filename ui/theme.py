from dataclasses import dataclass
import logging
from pathlib import Path

from PySide6.QtWidgets import QWidget, QApplication
from PySide6.QtGui import QPalette

import data.constants as constants
from ui.label import StyledLabel

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

def _getIconPath(icon_name: str) -> str:
    """Returns paths to the icon. If file not found, logs an error."""
    path = Path(constants.ASSETS_ICONS_DIR, icon_name)
    if not path.is_file():
        logging.error(f"[ui.theme] Cannot find icon: {path}")
        return ""

    return path.as_posix()      # Must be `as_posix()`, otherwise the stylesheet will fail to parse on Windows.

def _createTheme(
    # Hex colors
    accent_big,
    accent_small,
    font,
    font_disabled,
    canvas,
    border,
    progress_bar_text,

    # SVG icon paths
    checkmark_svg_url = _getIconPath("checkmark.svg"),
    drop_down_arrow_svg_url = _getIconPath("drop_down_arrow.svg"),
    drop_down_arrow_disabled_svg_url = _getIconPath("drop_down_arrow_disabled.svg"),
    up_arrow_svg_url = _getIconPath("up_arrow.svg"),
    up_arrow_disabled_svg_url = _getIconPath("up_arrow_disabled.svg"),
    down_arrow_svg_url = _getIconPath("down_arrow.svg"),
    down_arrow_disabled_svg_url = _getIconPath("down_arrow_disabled.svg"),
) -> str:
    """Creates a stylesheet for QApplication."""
    # Derived
    background_hover = hexToRGBA(accent_big, 20)
    background_selected = hexToRGBA(accent_big, 40)
    border_faded = hexToRGBA(border, 150)
    canvas_faded = hexToRGBA(canvas, 180)
    
    return f"""
    * {{
        font-family: "Open Sans";
        font-size: 12px;
        font-weight: 500;
    }}

    QWidget {{
        color: {font};
        background-color: {canvas};
        border: none;
        selection-color: {font};
        selection-background-color: {background_selected};
    }}

    QScrollBar:vertical {{
        border: none;
        width: 16px;
        background-color: {canvas};
        margin: 2px;
    }}

    QScrollBar::handle:vertical {{
        border: none;
        background: {border_faded};
        min-height: 50px;
    }}

    QScrollBar::handle:vertical:hover {{
        background: {border};
    }}

    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
        border: none;
        width: 0;
        height: 0;
    }}

    QPushButton {{
        color: {accent_big};
        padding: 4px;
        border: 1px solid {border};
        border-radius: 0px;
    }}

    QPushButton:hover {{
        background-color: {background_hover};
    }}

    QPushButton:pressed {{
        background-color: {background_selected};
    }}

    QPushButton:disabled {{
        color: {font_disabled};
    }}

    QPushButton:checked {{
        background-color: {background_selected};
    }}

    QRadioButton::indicator {{
        border-radius: 7px;
        border: 2px solid {font};
    }}

    QRadioButton::indicator:checked {{
        background-color: {accent_big};
        border: none;
    }}

    QRadioButton:disabled {{
        color: {font_disabled};
    }}

    QRadioButton::indicator:disabled {{
        border: 2px solid {font_disabled};
    }}

    QRadioButton::indicator:checked:disabled {{
        background-color: {font_disabled};
    }}

    QLineEdit {{
        padding: 4px;
        color: {font};
        background-color: {canvas};
        border-radius: 0px;
        background-color: {border};
    }}

    QLineEdit:disabled {{
        color: {font_disabled};
    }}

    QTabBar::tab {{
        background-color: transparent;
        padding: 7px;
        margin-right: 10px;
        font-size: 14px;
        font-weight: 400;
    }}

    QTabBar::tab:disabled {{
        color: {font_disabled};
    }}

    QTabBar::tab:first {{
        margin-left: 12px;
    }}

    QTabBar::tab:hover {{
        background-color: {border};
    }}

    QTabBar::tab:selected {{
        color: {accent_big};
        border-bottom: 2px solid {accent_small};
    }}

    QTabBar::tab:selected:disabled {{
        color: {font_disabled};
        border-bottom: 2px solid {font_disabled};
    }}

    QCheckBox {{
        border-radius: 0px;
    }}

    QCheckBox::indicator {{
        width: 12px;
        height: 12px;
        margin-right: 4px;
        border: 2px solid {font};
    }}

    QCheckBox::indicator:checked {{
        color: white;
        background-color: {accent_big};
        border: 2px solid transparent;          /* Keeps text from moving. */
        image: url("{checkmark_svg_url}");
    }}

    QCheckBox::indicator::unchecked:disabled {{
        border: 2px solid {font_disabled};
    }}

    QCheckBox::indicator::checked:disabled {{
        background-color: {font_disabled};
    }}

    QCheckBox:disabled {{
        color: {font_disabled}
    }}

    QSlider {{
        height: 20px;
    }}

    QSlider::handle:horizontal {{
        background-color: {accent_big};
        border-radius: 7px;
        width: 16px;
        height: 16px;
        margin: -6px 0;
        border-radius: 8px;
    }}

    QSlider::groove:horizontal {{
        background-color: {border};
        height: 4px;
    }}

    QSlider::sub-page:horizontal {{
        height: 4px;
        background-color: {accent_big};
    }}

    QSlider::sub-page:horizontal:disabled {{
        height: 4px;
        background-color: {border};
    }}

    QSlider::handle:disabled {{
        background-color: {border};
    }}

    QLabel:disabled {{
        color: {font_disabled};
    }}

    QTextEdit {{
        border-radius: 0px;
        border: 1px solid {border};
        background-color: {border};
        padding: 2px;
    }}

    QTextEdit:disabled {{
        color: {font_disabled};
    }}

    QTreeView {{
        background-color: {canvas};
        border: 1px solid {border};
        border-radius: 0px;
        show-decoration-selected: 0;
    }}

    QTreeView::item {{
        font-size: 9px;
        padding-top: 1px;
        padding-bottom: 1px;
    }}

    QTreeView>QHeaderView::section {{
        color: {font};
        background-color: {border};
        font-weight: 600;
        text-align: left;
        border: none;
        padding: 3px 3px 3px 13px;
    }}

    QTreeView QHeaderView::section:horizontal:!last {{
        border-right: 1px solid {canvas};
    }}

    QTreeView::item:disabled {{
        color: {font_disabled};
    }}

    QTableView {{
        /*
            This line removes the **focus rectangle** outline. It uses a workaround since Qt does not offer a direct way of styling it.

            https://forum.qt.io/topic/18888/how-to-remove-focus-rectangle-on-qlistview-and-similar-using-qstyleditemdelegate-with-style-sheets/11

            This method does not work for QTreeView. A custom delegate is used there.
        */

        outline: 0;
    }}

    QTreeView::item:hover {{
        background-color: {border};
    }}

    QTreeView::item:selected {{
        background-color: {background_selected};
    }}

    QComboBox {{
        background-color: {border};
        color: {font};
        border-radius: 0px;
        padding: 4px;
        padding-left: 6px;
    }}

    QComboBox:disabled {{
        color: {font_disabled};
    }}

    QComboBox::drop-down {{
        border: none;
    }}

    QComboBox QAbstractItemView {{
        /* The black bars on top and bottom are caused by adding `padding` to QComboBox. Is Qt supposed to work like this? */ https://stackoverflow.com/questions/78848355/pyqt6-combobox-weird-black-bars-on-top-and-bottom-sides */

        border-top: none;       /* without this the border does not change */
        border: 1px solid {border};
    }}

    QComboBox::down-arrow {{
        width: 12px;
        height: 12px;
        margin-right: 10px;
        image: url("{drop_down_arrow_svg_url}");
    }}

    QComboBox::down-arrow:disabled {{
        image: url("{drop_down_arrow_disabled_svg_url}");
    }}

    QSpinBox, QDoubleSpinBox {{
        color: {font};
        background-color: {border};
        padding: 4px;
        border: 1px solid {border};
        border-radius: 0px;
    }}

    QSpinBox:disabled, QDoubleSpinBox:disabled {{
        color: {font_disabled};
    }}

    QSpinBox::up-button, QDoubleSpinBox:up-button {{
        subcontrol-origin: border;
        subcontrol-position: top right;
        margin-right: 10px;
        margin-top: 2px;
        border: none;
    }}

    QSpinBox::down-button, QDoubleSpinBox:down-button {{
        subcontrol-origin: border;
        subcontrol-position: bottom right;
        margin-right: 10px;
        margin-bottom: 2px;
        border: none;
    }}

    QSpinBox::up-arrow, QDoubleSpinBox:up-arrow {{
        image: url("{up_arrow_svg_url}");
        width: 7px;
    }}

    QSpinBox::up-arrow:disabled, QDoubleSpinBox::up-arrow:disabled {{
        image: url("{up_arrow_disabled_svg_url}");
    }}

    QSpinBox::down-arrow, QDoubleSpinBox::down-arrow {{
        image: url("{down_arrow_svg_url}");
        width: 7px;
    }}

    QSpinBox::down-arrow:disabled, QDoubleSpinBox::down-arrow:disabled {{
        image: url("{down_arrow_disabled_svg_url}");
    }}

    QToolTip {{
        color: {font};
        background-color: {canvas};
        padding: 10px;
        border: 1px solid {border};
    }}

    QTableWidget QWidget, QTableWidget, QHeaderView {{ 
        background-color: {canvas};
    }}

    QTableWidget::item:focus {{
        border: none;
        outline: none;
    }}

    QGroupBox {{
        border: 1px solid {border};
        padding: 3px;
        margin-top: 7px;
        font-weight: 500;
        color: {font_disabled};
    }}

    QGroupBox::title {{
        subcontrol-origin: margin;
        subcontrol-position: top left;
        left: 10px;
        margin-left: 5px;
        margin-right: 5px;
    }}

    #settingsScrollArea {{
        border: 1px solid {border};
        /* Align with buttons */
        margin-top: 1px;
        margin-bottom: 1px;
    }}

    QScrollArea QScrollBar:vertical {{
        width: 18px;
    }}

    #settingsScrollArea QWidget {{
        margin: 3px;
    }}

    QMessageBox QPushButton {{
        qproperty-icon: none;
        min-width: 80px;
    }}

    QProgressBar {{
        color: {progress_bar_text};
        text-align: center;
        border: 1px solid {border};
    }}

    QProgressBar::chunk {{
        background-color: {accent_big};
    }}
    
    QProgressDialog QPushButton {{
        min-width: 80px;
    }}
    
    QTableWidget {{
        border: 1px solid {border};
    }}

    QTableView QHeaderView::section {{
        color: {font};
        background-color: {border};
        border: none;
        padding: 3px 3px 3px 13px;
    }}

    QTableView QHeaderView::section:horizontal:!last {{
        border-right: 1px solid {canvas};
    }}

    QTableView::item:selected {{
        background-color: {background_selected};
    }}

    /* Set fixed height to 25px */
    QPushButton, QSpinBox, QDoubleSpinBox {{
        min-height: 15px;
        max-height: 15px;
    }}

    QLineEdit, QComboBox {{
        min-height: 17px;
        max-height: 17px;
    }}

    QSpinBox, QDoubleSpinBox {{
        min-width: 20px;
    }}

    QTextEdit {{
        max-height: 45px;
    }}

    QTextEdit QScrollBar:vertical {{
        background-color: {border};
    }}

    QTextEdit QScrollBar::handle:vertical {{
        background-color: {canvas_faded};
        min-height: 3px;
    }}

    QTextEdit QScrollBar::handle:vertical:hover {{
        background-color: {canvas};
    }}

    /* About tab */
    #title_l {{
        font-family: "Open Sans";
        font-weight: 300;
        font-size: 30px;
    }}

    #version_l {{
        font-family: "Open Sans";
        font-weight: 700;
        font-size: 13px;
    }}
    """

def setTheme(theme="Ralsei") -> None:
    match theme:
        case "Ralsei":
            stylesheet = _createTheme(
                accent_big = "#00ff76",
                accent_small = "#ff0066",
                font = "#e9e9e9",
                font_disabled = "#9A9A9A",
                canvas = "#141414",
                border = "#404040",
                progress_bar_text = "#ff0066",
            )
            accent_big = "#00ff76"
        case "Dark Amber":

            stylesheet = _createTheme(
                accent_big = "#F18000",
                accent_small = "#F18000",
                font = "#E4E7EB",
                font_disabled = "#A1A1A1",
                canvas = "#202124",
                border = "#3F4042",
                progress_bar_text = "#E4E7EB",
            )
            accent_big = "#F18000"
        case "Light Amber":
            stylesheet = _createTheme(
                accent_big = "#F18000",
                accent_small = "#F18000",
                font = "#404040",
                font_disabled = "#9198A3",
                canvas = "#F8F9FA",
                border = "#D8DADE",
                progress_bar_text = "#404040",
                checkmark_svg_url = _getIconPath("checkmark_light.svg"),
                drop_down_arrow_svg_url = _getIconPath("drop_down_arrow_light.svg"),
                up_arrow_svg_url = _getIconPath("up_arrow_light.svg"),
                down_arrow_svg_url = _getIconPath("down_arrow_light.svg"),
            )
            accent_big = "#F18000"
        case _:
            logging.error(f"[setTheme] Unrecognized theme ({theme})")
            return


    app = QApplication.instance()
    app.setStyle("Fusion")  # Solves a lot of crossplatform issues. A common baseline.
    app.setStyleSheet(stylesheet)
    # Workaround for limited styling support in QSS.
    StyledLabel.updateStyleForAll(f"""
    a {{
        color: {accent_big};
        text-decoration: none;
    }}
    """)
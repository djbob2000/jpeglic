from dataclasses import dataclass
import logging
from pathlib import Path

from PySide6.QtWidgets import QWidget, QApplication
from PySide6.QtGui import QPalette

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

def _getIconPath(icon_name: str) -> str:
    """Returns paths to the icon. If file not found, logs an error."""
    path = Path(constants.ASSETS_ICONS_DIR, icon_name)
    if not path.is_file():
        logging.error(f"[ui.theme] Cannot find icon: {path}")
        return ""

    return path.as_posix()      # Must be `as_posix()`, otherwise the stylesheet will fail to parse on Windows.

def setTheme(theme="Ralsei"):
    match theme:
        case "Ralsei":
            # Base
            accent_big = "#00ff76"
            accent_small = "#ff0066"
            font = "#e9e9e9"
            canvas = "#141414"
            border = "#404040"

            # Derived
            font_disabled = "#9A9A9A"
            background_hover = hexToRGBA(accent_big, 20)
            background_selected = hexToRGBA(accent_big, 40)

            # SVG URLs
            checkmark_dark_svg_url = _getIconPath("check_mark.svg")
            drop_down_arrow_svg_url = _getIconPath("drop_down_arrow.svg")
            drop_down_arrow_disabled_svg_url = _getIconPath("drop_down_arrow_disabled.svg")
            up_arrow_svg_url = _getIconPath("up_arrow.svg")
            up_arrow_disabled_svg_url = _getIconPath("up_arrow_disabled.svg")
            down_arrow_svg_url = _getIconPath("down_arrow.svg")
            down_arrow_disabled_svg_url = _getIconPath("down_arrow_disabled.svg")
            
            stylesheet = f"""
            QWidget {{
                color: {font};
                background-color: {canvas};
                border: none;
                font-family: "Ubuntu";
                selection-color: {font};
                selection-background-color: {background_selected};
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
                image: url("{checkmark_dark_svg_url}");

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

            QTreeView>QHeaderView::section {{
                color: {font};
                background-color: {border};
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

            QTreeView, QTableView {{
                /*
                    Do not remove this line!! This is a workaround to remove the **focus rectangle** outline. Qt does not offer a direct way of styling it.

                    https://forum.qt.io/topic/18888/how-to-remove-focus-rectangle-on-qlistview-and-similar-using-qstyleditemdelegate-with-style-sheets/11

                    What I found so far:
                    - Its selector is kind of `QTreeView::item:focus` but it does not work.
                    - `selection-background-color` affects it (both background and outline), but it does not remove the outline (even if transparent).
                    - `self.setFocusPolicy(Qt.NoFocus)` removes the focus rectangle, but it also disables keyboard navigation.
                    - You can remove the focus rectangle by removing either border or outline from QTreeView. The downside is you won't have a border over the QTreeView widget. The focus rectangle inherits this property.

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
                font-size: 12px;
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
                background-color: transparent;
                width: 20px;
                margin: 16px 0 16px 0;
            }}

            QScrollArea QScrollBar::handle:vertical {{
                background-color: {border};
                min-height: 20px;
                margin: 0 2px 0 2px;
            }}

            QScrollArea QScrollBar::handle:vertical {{
                background-color: {border};
                border: none;
            }}

            QScrollArea QScrollBar::add-line:vertical {{
                height: 12px;
                width: 6px;
                background-color: {border};
                subcontrol-position: bottom;
                subcontrol-origin: margin;
                margin: 0 1px 4px 0;
                padding: 2px;
                image: url("{down_arrow_svg_url}");
            }}

            QScrollArea QScrollBar::sub-line:vertical {{
                height: 12px;
                width: 6px;
                background-color: {border};
                subcontrol-position: top;
                subcontrol-origin: margin;
                margin: 4px 1px 0 0;
                padding: 2px;
                image: url("{up_arrow_svg_url}");
            }}

            #settingsScrollArea QWidget {{
                margin: 3px;
            }}

            QMessageBox QPushButton {{
                qproperty-icon: none;
                min-width: 80px;
            }}

            QProgressBar {{
                color: {accent_small};
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

            /* Sets fixed height to 26px; Regular height does not work and there is some weird discrepancy. */
            QPushButton, QSpinBox, QDoubleSpinBox {{
                min-height: 14px;
                max-height: 14px;
            }}

            QComboBox, QLineEdit {{
                min-height: 16px;
                max-height: 16px;
            }}

            QSpinBox, QDoubleSpinBox {{
                min-height: 14px;
                min-width: 20px;
            }}

            """
            app = QApplication.instance()
            app.setStyle("Fusion")  # Solves a lot of crossplatform issues. A common baseline.
            app.setStyleSheet(stylesheet)
        
        # For future use:
        # case "Dark Amber (Classic)":
        #     accent="#F18000"
        #     canvas="#202124"
        #     font="#E4E7EB"
        #     border="#3F4042"
        # case "Light Amber (Classic)":
        #     pass
        # case "Empty Town":
        #     pass
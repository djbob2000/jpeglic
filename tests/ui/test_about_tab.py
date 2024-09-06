from unittest.mock import patch

import pytest
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt

from ui.about_tab import AboutTab

@pytest.fixture
def about_tab(qtbot):
    tab = AboutTab()
    qtbot.addWidget(tab)
    return tab

def test_checkForUpdates(about_tab, qtbot):
    with patch("ui.about_tab.UpdateChecker.run") as mock_run:
        qtbot.mouseClick(about_tab.update_btn, Qt.LeftButton)
        mock_run.assert_called_once()
        assert not about_tab.update_btn.isEnabled()

def test_update_btn_reenabled(about_tab, qtbot):
    with patch("ui.about_tab.UpdateChecker.run") as mock_run:
        qtbot.mouseClick(about_tab.update_btn, Qt.LeftButton)
        assert not about_tab.update_btn.isEnabled()
        about_tab.update_checker.finished.emit()
        assert about_tab.update_btn.isEnabled()

@pytest.mark.parametrize("button", [
    "manual_btn",
    "report_bug_btn",
    "donate_btn",
])
def test_openExternalLinks(button, about_tab, qtbot):
    with patch("PySide6.QtGui.QDesktopServices.openUrl") as mock_openUrl:
        btn_ref = getattr(about_tab, button, None)
        if btn_ref is None:
            assert False, f"Button \"{button}\" not found in AboutTab"
        qtbot.mouseClick(btn_ref, Qt.LeftButton)
        mock_openUrl.assert_called_once()
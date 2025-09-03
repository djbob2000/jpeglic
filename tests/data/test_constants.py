from unittest.mock import patch
import sys
from importlib import reload
import platform
import os

import pytest

import data.constants as constants
import data.utils as utils

@pytest.fixture(autouse=True)
def reload_constants():
    yield
    reload(constants)

@pytest.mark.parametrize("mock_os", ["Windows", "Linux"])
def test_vars_filled(mock_os):
    assert constants.VERSION != ""
    assert constants.UPDATE_CHECKER_VER_FILE_URL != ""

    assert constants.PROGRAM_FOLDER != ""
    assert constants.ICON_SVG != ""
    assert constants.LICENSE_PATH != ""
    assert constants.LICENSE_3RD_PARTY_PATH != ""

    with patch("data.constants.platform.system", return_value=mock_os):
        reload(constants)
        assert constants.CONFIG_LOCATION != ""

        assert constants.CJXL_PATH != "" and constants.CJXL_PATH != "cjxl"
        assert constants.DJXL_PATH != "" and constants.DJXL_PATH != "djxl"
        assert constants.JXLINFO_PATH != "" and constants.JXLINFO_PATH != "jxlinfo"
        assert constants.CJPEGLI_PATH != "" and constants.CJPEGLI_PATH != "cjpegli"
        assert constants.IMAGE_MAGICK_PATH != "" and constants.IMAGE_MAGICK_PATH != "magick"
        assert constants.AVIFENC_PATH != "" and constants.AVIFENC_PATH != "avifenc"
        assert constants.AVIFDEC_PATH != "" and constants.AVIFDEC_PATH != "avifdec"
        assert constants.OXIPNG_PATH != "" and constants.OXIPNG_PATH != "oxipng"
        
        if platform.system() == "Windows":
            assert constants.EXIFTOOL_PATH != "" and constants.EXIFTOOL_PATH != "exiftool"
    
    assert len(constants.ALLOWED_INPUT) > 0

def test_program_folder_frozen():
    with patch.object(sys, "frozen", True, create=True), \
         patch.object(sys, "_MEIPASS", "/tmp/frozen", create=True):
        reload(constants)       # Reload and apply patches
        assert constants.PROGRAM_FOLDER == "/tmp/frozen"

def test_program_folder_not_frozen():
    with patch.object(sys, "frozen", False, create=True), \
         patch("os.path.realpath", return_value="/path/to/program/data/constants.py"):
        reload(constants)
        assert constants.PROGRAM_FOLDER == "/path/to/program"

def test_config_location_linux_portable():
    with (
        patch("data.constants.platform.system", return_value="Linux"),
        patch("data.constants.ConfigManager.getboolean", return_value=True) as mock_getboolean,
        patch("data.constants.isRunningInFlatpak", return_value=False),
    ):
        reload(constants)
        assert constants.CONFIG_LOCATION == os.path.join(constants.PROGRAM_FOLDER, "user_data")
        mock_getboolean.assert_called_once_with("General", "portable_user_data", False)

def test_config_location_linux_default():
    with (
        patch("data.constants.platform.system", return_value="Linux"),
        patch("data.constants.ConfigManager.getboolean", return_value=False) as mock_getboolean,
        patch("data.constants.isRunningInFlatpak", return_value=False),
    ):
        reload(constants)
        assert constants.CONFIG_LOCATION == os.path.expanduser('~/.config/xl-converter')

def test_config_location_linux_flatpak():
    with (
        patch("data.constants.platform.system", return_value="Linux"),
        patch("data.constants.ConfigManager.getboolean", return_value=False) as mock_getboolean,
        patch("data.constants.isRunningInFlatpak", return_value=True),
        patch("data.constants.os.environ.get", return_value="/tmp/path"),
    ):
        reload(constants)
        assert constants.CONFIG_LOCATION == os.path.join("/tmp/path", "xl-converter")

def test_config_location_linux_flatpak_no_xdg_home():
    with (
        patch("data.constants.platform.system", return_value="Linux"),
        patch("data.constants.ConfigManager.getboolean", return_value=False) as mock_getboolean,
        patch("data.constants.isRunningInFlatpak", return_value=False),
    ):
        reload(constants)
        assert constants.CONFIG_LOCATION == os.path.expanduser('~/.config/xl-converter')

def test_config_location_win_portable():
    with (
        patch("data.constants.platform.system", return_value="Windows"),
        patch("data.constants.ConfigManager.getboolean", return_value=True) as mock_getboolean,
        patch("data.constants.isRunningInFlatpak", return_value=False),
    ):
        reload(constants)
        assert constants.CONFIG_LOCATION == os.path.join(constants.PROGRAM_FOLDER, "user_data")
        mock_getboolean.assert_called_once_with("General", "portable_user_data", False)

def test_config_location_win_default():
    with (
        patch("data.constants.platform.system", return_value="Windows"),
        patch("data.constants.ConfigManager.getboolean", return_value=False) as mock_getboolean,
        patch("data.constants.isRunningInFlatpak", return_value=False),
    ):
        reload(constants)
        assert constants.CONFIG_LOCATION == os.path.normpath(os.path.expanduser("~/AppData/Local/xl-converter"))

def test_VERSION_parsable():
    assert utils.parseVersion(constants.VERSION) is not None, f"Current version ({constants.VERSION}) is not parsable. Update checker will not work correctly. Adjust data.utils.parseVersion to account for the new scheme."

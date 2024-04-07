import pytest
from pathlib import Path

from core.pathing import (
    getUniqueFilePath,
    getPathGIF,
    getExtension,
    getOutputDir,
    isANSICompatible,
)

def test_getExtension():
    assert getExtension("JPEG XL") == "jxl"
    assert getExtension("PNG") == "png"
    assert getExtension("AVIF") == "avif"
    assert getExtension("WEBP") == "webp"
    assert getExtension("JPG") == "jpg"

def test_getExtension_unknown():
    assert getExtension("Smallest Lossless") == None
    assert getExtension("FLIF") == None

@pytest.mark.parametrize(
    "item_dir_path,item_anchor_path,custom_dir,custom_dir_path,keep_dir_struct,expected",
    [
        ("/home/user/Pictures", Path("/home/user"), False, "/home/user/Files", False, "/home/user/Pictures"),    # src
        ("/home/user/Pictures", Path("/home/user"), True, "Images", False, "/home/user/Pictures/Images"),        # rel.
        ("/home/user/Pictures", Path("/home/user"), True, "/home/user/Files", False, "/home/user/Files"),        # abs.
        ("/home/user/Pictures", Path("/home/user/Pictures"), False, "", False, "/home/user/Pictures"),  # rel.
        ("/home/user/Pictures", Path("/home/user"), True, "/home/user/Files", True, "/home/user/Files/Pictures"),        # keep_dir_struct parent
        ("/home/user/Pictures/screenshots", Path("/home/user/Pictures"), True, "/home/user/Files", True, "/home/user/Files/screenshots"),        # keep_dir_struct subfolder
    ]
)

def test_getOutputDir(item_dir_path, item_anchor_path, custom_dir, custom_dir_path, keep_dir_struct, expected):
    assert getOutputDir(item_dir_path, item_anchor_path, custom_dir, custom_dir_path, keep_dir_struct) == expected

@pytest.mark.parametrize(
    "item_dir_path,item_anchor_path,custom_dir,custom_dir_path,keep_dir_struct", [
        ("/home/user/Pictures", Path("/home/different_user/Pictures"), True, "/home/user/Files", True)
    ]
)

def test_getOutputDir_exception(item_dir_path, item_anchor_path, custom_dir, custom_dir_path, keep_dir_struct, caplog):
    getOutputDir(item_dir_path, item_anchor_path, custom_dir, custom_dir_path, keep_dir_struct)
    assert "[Pathing] Failed to calculate relative path." in caplog.text

def test_isANSICompatible_compatible():
    assert isANSICompatible("C:\\Users\\User\\Pictures")

def test_isANSICompatible_not_compatible():
    assert not isANSICompatible("D:\\画像")
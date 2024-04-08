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
        (Path("/home/user/Pictures"), Path("/home/user"), False, Path("/home/user/Files"), False, Path("/home/user/Pictures")),    # src
        (Path("/home/user/Pictures"), Path("/home/user"), True, "Images", False, Path("/home/user/Pictures/Images")),        # rel.
        (Path("/home/user/Pictures"), Path("/home/user"), True, Path("/home/user/Files"), False, Path("/home/user/Files")),        # abs.
        (Path("/home/user/Pictures"), Path("/home/user/Pictures"), False, "", False, Path("/home/user/Pictures")),  # rel.
        (Path("/home/user/Pictures"), Path("/home/user"), True, Path("/home/user/Files"), True, Path("/home/user/Files/Pictures")),        # keep_dir_struct parent
        (Path("/home/user/Pictures/screenshots"), Path("/home/user/Pictures"), True, Path("/home/user/Files"), True, Path("/home/user/Files/screenshots")),        # keep_dir_struct subfolder
    ]
)

def test_getOutputDir(item_dir_path, item_anchor_path, custom_dir, custom_dir_path, keep_dir_struct, expected):
    assert getOutputDir(str(item_dir_path), item_anchor_path, custom_dir, str(custom_dir_path), keep_dir_struct) == str(expected)

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
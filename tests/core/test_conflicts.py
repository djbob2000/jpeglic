from unittest.mock import patch

import pytest

import core.conflicts as conflicts
from core.exceptions import GenericException, FileException

def test_checkForConflicts_no_conflict():
    assert not conflicts.checkForConflicts("jpg", "WebP")

def test_checkForConflicts_gif_unsupported():
    with pytest.raises(GenericException) as excinfo:
        conflicts.checkForConflicts("gif", "JPEG")

    assert "GIF -> JPEG conversion is not supported" == excinfo.value.msg

def test_checkForConflicts_gif_supported():
    assert not conflicts.checkForConflicts("gif", "JPEG XL")

def test_checkForConflicts_apng_unsupported():
    with pytest.raises(GenericException) as excinfo:
        conflicts.checkForConflicts("apng", "WebP")

    assert "APNG -> WebP conversion is not supported" == excinfo.value.msg

def test_checkForConflicts_apng_supported():
    assert not conflicts.checkForConflicts("apng", "JPEG XL")

def test_checkForConflicts_downscaling():
    with pytest.raises(GenericException) as excinfo:
        conflicts.checkForConflicts("gif", "JPEG XL", True)
    
    assert "Downscaling is not supported for animation" == excinfo.value.msg

def test_checkForMultipage_happy_path():
    stdout, stderr = "1", ""
    src_abs_path = "path/to/src.tiff"

    with (
        patch("core.conflicts.runBinary", return_value=(stdout, stderr)) as mock_runBinary,
        patch("core.conflicts.IMAGE_MAGICK_PATH", "im_path") as ImageMagick_path,
    ):
        conflicts.checkForMultipage("tiff", src_abs_path)
    mock_runBinary.assert_called_once_with(
        ImageMagick_path,
        ["identify", "-format", "%n\n"],
        src_abs_path
    )

def test_checkForMultipage_cannot_detect():
    stdout, stderr = "", "Error"
    with (
        patch("core.conflicts.runBinary", return_value=(stdout, stderr)) as mock_runBinary,
        pytest.raises(FileException) as excinfo,
    ):
        conflicts.checkForMultipage("tiff", "path/to/src.tiff")
    
    assert "CF2" == excinfo.value.id
    assert "Cannot detect the number of pages." in excinfo.value.msg
    assert stderr in excinfo.value.msg

def test_checkForMultipage_multipage():
    stdout, stderr = "2", ""
    with (
        patch("core.conflicts.runBinary", return_value=(stdout, stderr)) as mock_runBinary,
        pytest.raises(FileException) as excinfo,
    ):
        conflicts.checkForMultipage("tiff", "path/to/src.tiff")
    
    assert "CF3" == excinfo.value.id
    assert "Multipage images are not supported" in excinfo.value.msg
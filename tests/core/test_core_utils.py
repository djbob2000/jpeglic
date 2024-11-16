from pathlib import Path
import os
from unittest.mock import mock_open, patch
from hashlib import blake2b

import pytest

import core.utils as utils
from core.exceptions import FileException

@pytest.fixture
def tmp_dir(tmp_path):
    """Creates nested dir with files."""
    d = tmp_path / "dir"
    d.mkdir()
    (d / "test_file.txt").write_text("test")
    (d / "nested").mkdir()
    (d / "nested" / "test_file_2.txt").write_text("test")
    return tmp_path

def test_scanDir_empty(tmp_path):
    assert utils.scanDir(tmp_path) == []

def test_scanDir_files(tmp_dir):
    files = utils.scanDir(tmp_dir)
    assert len(files) == 2
    assert all(os.path.isfile(file) for file in files)
    assert any("test_file.txt" in file for file in files)
    assert any("test_file_2.txt" in file for file in files)

def test_scanDir_non_existent():
    with pytest.raises(FileNotFoundError):
        utils.scanDir("non_existent_dir")

def test_dictToList_empty():
    assert utils.dictToList({}) == []

def test_dictToList_flat():
    assert utils.dictToList({
        "a": 0,
        "b": 1,
    }) == [
        ("a", 0),
        ("b", 1),
    ]

def test_dictToList_nested():
    assert utils.dictToList({
        "a": 0,
        "b": {
            "c": 2,
            "d": 3,
        },
    }) == [
        ("a", 0),
        ("b", [
            ("c", 2),
            ("d", 3),
        ]),
    ]

def test_dictToList_deeply_nested():
    assert utils.dictToList({
        "a": 0,
        "b": {
            "c": {
                "d": {
                    "e": 1
                }
            }
        },
    }) == [
        ("a", 0),
        ("b", [
            ("c", [
                ("d", [
                    ("e", 1),
                ]),
            ]),
        ]),
    ]

def test_clip():
    assert utils.clip(150, 0, 100) == 100
    assert utils.clip(-50, 0, 100) == 0
    assert utils.clip(50, 0, 100) == 50

def test_b2sum_valid_path():
    file_content = b"test"
    expected_hash = blake2b(file_content, digest_size=64).hexdigest()

    with (
        patch.object(Path, "open", mock_open(read_data=file_content)),
    ):
        assert utils.b2sum("path/to/file") == expected_hash, "The hash does not match."

def test_b2sum_invalid_path():
    with (
        patch.object(Path, "open", side_effect=OSError("File not found")),
        pytest.raises(OSError),
    ):
        utils.b2sum("path/to/file")

def test_b2sum_invalid_digest_size():
    with (
        patch.object(Path, "open", mock_open(read_data=b"test")),
        pytest.raises(ValueError)
    ):
        utils.b2sum("path/to/file", digest_size=65)

def test_b2sum_different_chunk_size():
    file_content = b"test"
    expected_hash = blake2b(file_content, digest_size=64).hexdigest()

    with (
        patch.object(Path, "open", mock_open(read_data=file_content)),
    ):
        assert utils.b2sum("path/to/file", chunk_size=8) == expected_hash, "The hash does not match."

def test_remove_happy_path():
    file_path, exc_id = "/path/file.jpg", "exception_id_0"
    with patch("core.utils.os.remove") as mock_remove:
        utils.remove(file_path, exc_id="exception_id_0")
    
    mock_remove.assert_called_once_with(file_path)

def test_remove_sad_path():
    file_path, exc_id = "/path/file.jpg", "exception_id_0"
    with (
        patch("core.utils.os.remove", side_effect=OSError("OSError")) as mock_remove,
        pytest.raises(FileException) as excinfo,
    ):
        utils.remove(file_path, exc_id=exc_id)
    
    assert exc_id == excinfo.value.id
    assert "Failed to remove file" in excinfo.value.msg
    assert "OSError" in excinfo.value.msg
    mock_remove.assert_called_once_with(file_path)
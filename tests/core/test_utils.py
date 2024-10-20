from pathlib import Path
import os

import pytest

import core.utils as utils

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
import random
from unittest.mock import patch

import pytest

import data.utils as utils

def test_removeDuplicatesHashable_no_duplicates():
    assert utils.removeDuplicatesHashable([1, 2, 3]) == [1, 2, 3]

def test_removeDuplicatesHashable_with_duplicates():
    assert utils.removeDuplicatesHashable([1, 1, 2]) == [1, 2]

def test_removeDuplicatesHashable_all_duplicates():
    assert utils.removeDuplicatesHashable([1, 1, 1]) == [1]

def test_removeDuplicatesHashable_mixed_types():
    assert utils.removeDuplicatesHashable([1, "a", 2, "a", 1]) == [1, "a", 2]

def test_removeDuplicatesHashable_nested_list():
    assert utils.removeDuplicatesHashable([(1, 2), (1, 2), (3),]) == [(1, 2), (3)]

def test_removeDuplicatesHashable_unhashable():
    with pytest.raises(TypeError) as excinfo:
        utils.removeDuplicatesHashable([[1, 2], [1, 2], [3]])
    assert "unhashable" in str(excinfo.value)

def test_removeDuplicatesHashable_strings():
    assert utils.removeDuplicatesHashable(["a", "a", "b"]) == ["a", "b"]

def test_removeDuplicatesHashable_order():
    alphabet = [chr(i) for i in range(ord('a'), ord('z') + 1)]
    duplicates = random.choices(alphabet, k=1000)
    unique = []
    for letter in duplicates:
        if letter not in unique:
            unique.append(letter)
    assert utils.removeDuplicatesHashable(duplicates) == unique

def test_removeDuplicatesHashable_empty():
    assert utils.removeDuplicatesHashable([]) == []

def test_listToFilter_empty():
    assert utils.listToFilter(
        "Images",
        []
    ) == "All Files (*)"

def test_listToFilter_single_ext():
    assert utils.listToFilter(
        "Image",
        ["jpg"]
    ) == "Image (*.jpg)"

def test_listToFilter_multiple_ext():
    assert utils.listToFilter(
        "Images",
        ["jpg", "png", "webp", "jxl", "avif"]
    ) == "Images (*.jpg *.png *.webp *.jxl *.avif)"

def test_isRunningInFlatpak_true():
    with patch("data.utils.os.environ.get", return_value="org.example.app"):
        assert utils.isRunningInFlatpak()

def test_isRunningInFlatpak_false():
    with patch("data.utils.os.environ.get", return_value=None):
        assert not utils.isRunningInFlatpak()

@pytest.mark.parametrize(
    "version,expected",
    [
        (None, None),
        ("", None),
        ("v1.2", None),
        ("abc", None),
        ("v1.2.3", (1, 2, 3)),
        ("1.2.3", (1, 2, 3)),
        ("1.0.11", (1, 0, 11)),
    ]
)
def test_parseVersion(version, expected):
    assert utils.parseVersion(version) == expected

@pytest.mark.parametrize(
    "base,candidate,expected",
    [
        ("v1.2.3", "v1.2.4", 1),
        ("v1.2.3", "v1.2.3", 0),
        ("v1.2.4", "v1.2.3", -1),
    ]
)
def test_compareVersions_happy_path(base, candidate, expected):
    assert utils.compareVersions(base, candidate) == expected

@pytest.mark.parametrize(
    "policy,expected",
    [
        (utils.VersionParseErrorPolicy.ASSUME_NEWER, 1),
        (utils.VersionParseErrorPolicy.ASSUME_EQUAL, 0),
        (utils.VersionParseErrorPolicy.ASSUME_OLDER, -1),
    ]
)
def test_compareVersions_parse_error_policies(policy, expected):
    assert utils.compareVersions(None, "v1.2.3", parse_error_policy=policy) == expected

def test_compareVersions_raise_on_parse_error():
    with pytest.raises(ValueError):
        utils.compareVersions(None, "v1.2.3", parse_error_policy=utils.VersionParseErrorPolicy.RAISE)

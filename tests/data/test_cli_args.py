import sys
from unittest.mock import patch, MagicMock
from pathlib import Path

import pytest
from PySide6.QtCore import QUrl, QPointF, Qt

import data.cli_args as cli_args

def test_parseArgs_no_args():
    sys_args = ["script.py"]
    mock_path = MagicMock(spec=Path)
    mock_path.is_file.return_value = True
    mock_path.is_dir.return_value = True

    with (
        patch.object(sys, "argv", sys_args),
        patch("data.cli_args.Path", return_value=mock_path)
    ):
        _args = cli_args.parseArgs()
        assert _args.resources == []
        mock_path.assert_not_called()

@pytest.mark.parametrize("arguments, is_file, is_dir, expected_args", [
    (["script.py", "/tmp/path"], [False], [True], ["/tmp/path"]),
    (["script.py", "/tmp/path", "/tmp/path2"], [False, False], [True, True], ["/tmp/path", "/tmp/path2"]),
    (["script.py", "/tmp/path/dir0", "/tmp/path/image1.jpg"], (True, False), (False, True), ["/tmp/path/dir0", "/tmp/path/image1.jpg"]),
    (["script.py", "/tmp/path/dir0", "/tmp/path/image1.jpg", "/tmp/path/image2.jpg"], (False, False, True), (False, False, False), ["/tmp/path/image2.jpg"]),
    (["script.py", "/tmp/path/dir0"], (False,), (False,), []),
])
def test_parseArgs_resources(arguments, is_file, is_dir, expected_args):
    # Create local copies to avoid messing with other tests
    is_file = list(is_file)
    is_dir = list(is_dir)

    def mock_path_constructor(path_str):
        mock_path = MagicMock(spec=Path)
        mock_path.is_file.return_value = is_file.pop(0)
        mock_path.is_dir.return_value = is_dir.pop(0)
        mock_path.__str__.return_value = path_str
        return mock_path

    with (
        patch.object(sys, "argv", arguments),
        patch("data.cli_args.Path", mock_path_constructor)
    ):
        _args = cli_args.parseArgs()
        assert [str(path) for path in _args.resources] == expected_args

def test_parseArgs_debug():
    with patch.object(sys, "argv", ["script.py", "--debug"]):
        _args = cli_args.parseArgs()
        assert _args.debug == True

def test_getArgsLocalResQDropEvent_no_args():
    with (
        patch.object(sys, "argv", ["script.py"]),
        patch("data.cli_args.parseArgs") as mock_parseArgs,
    ):
        assert cli_args.getArgsLocalResQDropEvent() is None
        mock_parseArgs.assert_not_called()

def test_getArgsLocalResQDropEvent_args_present_no_res():
    mock_args = cli_args.CliArgs(resources=[])

    with (
        patch.object(sys, "argv", ["script.py", "/tmp/path"]),
        patch("data.cli_args.parseArgs", return_value=mock_args) as mock_parseArgs,
    ):
        assert cli_args.getArgsLocalResQDropEvent() is None
        mock_parseArgs.assert_called_once()

def test_getArgsLocalResQDropEvent_args_passed(app):
    mock_args = cli_args.CliArgs(
        resources=["/tmp/path/dir0", "/tmp/path/img.jpg"]
    )

    with (
        patch.object(sys, "argv", ["script.py"] + mock_args.resources),
        patch("data.cli_args.parseArgs", return_value=mock_args) as mock_parseArgs,
    ):
        drop_event = cli_args.getArgsLocalResQDropEvent()
        mock_parseArgs.assert_called_once()

        assert drop_event.position() == QPointF(0.0, 0.0)
        assert drop_event.dropAction() == Qt.CopyAction
        assert drop_event.mimeData().urls() == [QUrl.fromLocalFile(res) for res in mock_args.resources]
        assert drop_event.buttons() == Qt.LeftButton
        assert drop_event.modifiers() == Qt.NoModifier

@pytest.mark.parametrize(
    "mock_args, expect_called, expected_result",
    [
        (cli_args.CliArgs(debug=True), True, None),
        (cli_args.CliArgs(debug=False), False, None),
        (
            cli_args.CliArgs(resources=["/tmp/path/dir0", "/tmp/path/img.jpg"], debug=True),
            True,
            [QUrl.fromLocalFile("/tmp/path/dir0"), QUrl.fromLocalFile("/tmp/path/img.jpg")],
        ),
    ],
)
def test_getArgsLocalResQDropEvent_debug(mock_args, expect_called, expected_result):
    mock_debug_callable = MagicMock()
    argv = ["script.py"]
    argv += (["--debug"] if expect_called else ["--sample-arg"])    # Ensures parseArgs is always called.
    if mock_args.resources:
        argv += mock_args.resources

    with (
        patch.object(sys, "argv", argv),
        patch("data.cli_args.parseArgs", return_value=mock_args) as mock_parseArgs,
    ):
        drop_event = cli_args.getArgsLocalResQDropEvent(debug_callable=mock_debug_callable)
        mock_parseArgs.assert_called_once()
        assert mock_debug_callable.call_count == int(expect_called)
        if expected_result is None:
            assert drop_event is None
        else:
            assert drop_event is not None
            assert drop_event.mimeData().urls() == expected_result

from unittest.mock import patch, MagicMock, ANY, call
import subprocess
import os

import pytest

from core.process import (
    _getStartupInfo,
    runProcess,
    runProcessOutput,
)

def test___getStartupInfo_windows():
    if os.name == "nt":
        with patch("core.process.subprocess.STARTUPINFO") as mock_startupinfo:
            startupinfo_instance = MagicMock()
            mock_startupinfo.return_value = startupinfo_instance
            startupinfo_instance.dwFlags = subprocess.STARTF_USESHOWWINDOW
            startupinfo_instance.wShowWindow = subprocess.SW_HIDE

            assert startupinfo_instance.dwFlags == subprocess.STARTF_USESHOWWINDOW
            assert startupinfo_instance.wShowWindow == subprocess.SW_HIDE
            assert _getStartupInfo() is startupinfo_instance
    else:
        assert _getStartupInfo() is None

def test_runProcess():
    cmd = ("echo", "Hello world")
    expected_stdout = b"Hello world\n"
    expected_stderr = b""

    with (
        patch("core.process.subprocess.Popen", autospec=True) as mock_popen,
        patch("core.process.logging.info") as mock_logging_info,
        patch("data.process_manager.ProcessManager.addProcess") as mock_addProcess,
    ):
        mock_process = mock_popen.return_value
        mock_process.communicate.return_value = (expected_stdout, expected_stderr)
        mock_process.wait.return_value = None

        runProcess(*cmd)

        mock_popen.assert_called_once_with(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=ANY, cwd=None)
        mock_addProcess.assert_called_once_with(mock_process)
        mock_process.wait.assert_called_once()
        mock_process.communicate.assert_called_once()
        assert len(mock_logging_info.call_args_list) == 2
        assert mock_logging_info.call_args_list[0][0][0] == f"[runProcess] {cmd}"
        assert mock_logging_info.call_args_list[1][0][0] == f"[runProcess] {expected_stdout.decode('utf-8')}"

def test_runProcessOutput():
    with (
        patch("core.process.subprocess.run") as mock_run,
        patch("core.process.logging") as mock_logging,
    ):
        mock_run.return_value = subprocess.CompletedProcess(args=["echo", "test"], stdout=b"test", stderr=b"err", returncode=0)

        out, err = runProcessOutput(["echo", "test"])

        assert out == "test"
        assert err == "err"
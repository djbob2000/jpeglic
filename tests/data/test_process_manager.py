import subprocess
from unittest.mock import patch, MagicMock

import pytest

from data.process_manager import ProcessManager

@pytest.fixture(autouse=True)
def reset():
    ProcessManager.processes.clear()
    yield ProcessManager
    ProcessManager.processes.clear()

def test_addProcess_happy_path():
    mock_process = MagicMock(spec=subprocess.Popen)

    with patch.object(ProcessManager, "lock", MagicMock()) as mock_lock:
        ProcessManager.addProcess(mock_process)
        assert mock_process in ProcessManager.processes
        mock_lock.__enter__.assert_called_once()
        mock_lock.__exit__.assert_called_once()

def test_addProcess_invalid_type():
    with pytest.raises(TypeError):
        ProcessManager.addProcess("invalid")

def test_removeProcess_happy_path():
    process_to_remove = MagicMock(spec=subprocess.Popen)
    ProcessManager.processes = [
        *[MagicMock(spec=subprocess.Popen) for _ in range(3)],
        process_to_remove
    ]

    assert process_to_remove in ProcessManager.processes
    with patch.object(ProcessManager, "lock", MagicMock()) as mock_lock:
        ProcessManager.removeProcess(process_to_remove)
        assert process_to_remove not in ProcessManager.processes
        assert len(ProcessManager.processes) > 0
        mock_lock.__enter__.assert_called_once()
        mock_lock.__exit__.assert_called_once()

def test_removeProcess_invalid_type():
    with pytest.raises(TypeError):
        ProcessManager.removeProcess("invalid")

def test_removeProcess_non_existent():
    ProcessManager.removeProcess(MagicMock(spec=subprocess.Popen))

def test_terminateAll_full():
    mock_processes = [MagicMock(spec=subprocess.Popen) for _ in range(5)]
    ProcessManager.processes = mock_processes

    ProcessManager.terminateAll()

    assert ProcessManager.processes == []
    for mock_process in mock_processes:
        mock_process.terminate.assert_called_once()
        mock_process.wait.assert_called_once()

def test_terminateAll_empty():
    ProcessManager.processes = []
    ProcessManager.terminateAll()
    # Nothing raised

def test_clear():
    ProcessManager.processes = [MagicMock(spec=subprocess.Popen) for _ in range(3)]

    with patch.object(ProcessManager, "lock", MagicMock()) as mock_lock:
        ProcessManager.clear()
        assert ProcessManager.processes == []
        mock_lock.__enter__.assert_called_once()
        mock_lock.__exit__.assert_called_once()
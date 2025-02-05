import pytest

import data.task_status as task_status

@pytest.fixture(autouse=True)
def reset():
    task_status.reset()
    yield
    task_status.reset()

def test_task_status_init():
    assert task_status.wasCanceled() == False

def test_task_status_reset():
    assert task_status.wasCanceled() == False
    task_status.cancel()
    assert task_status.wasCanceled() == True
    task_status.reset()
    assert task_status.wasCanceled() == False

def test_task_status_multiple_cancel_calls():
    task_status.cancel()
    task_status.cancel()
    assert task_status.wasCanceled() == True

def test_task_status_multiple_reset_calls():
    task_status.cancel()
    task_status.reset()
    task_status.reset()
    assert task_status.wasCanceled() == False

def test_task_status_cancel_after_reset():
    task_status.cancel()
    task_status.reset()
    task_status.cancel()
    assert task_status.wasCanceled() == True

def test_task_status_reset_after_cancel():
    task_status.reset()
    task_status.cancel()
    task_status.reset()
    assert task_status.wasCanceled() == False

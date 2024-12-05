import os
import cProfile
import pstats
from contextlib import contextmanager
from pathlib import Path

import pytest
from PySide6.QtWidgets import QApplication

@pytest.fixture(scope="session")
def app():
    os.environ["QT_QPA_PLATFORM"] = "offscreen" # Headless
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    yield app
    app.quit()

@contextmanager
def profile_test(sort_by: str = "cumulative"):
    profiler = cProfile.Profile()
    try:
        profiler.enable()
        yield
    finally:
        profiler.disable()

        with open("cProfile_output", "w") as f:
            stats = pstats.Stats(profiler, stream=f)
            stats.sort_stats(sort_by)
            stats.print_stats()

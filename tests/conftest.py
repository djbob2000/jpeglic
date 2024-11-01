import cProfile
import pstats
from contextlib import contextmanager
from pathlib import Path

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

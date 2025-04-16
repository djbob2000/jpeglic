#   Operating System    Timestamps          Caveat
#   Linux               Birth, Change       Cannot be manually edited.

from dataclasses import dataclass
import platform
import os

PYWIN32_AVAILABLE = False
if platform.system() == "Windows":
    try:
        import pywintypes
        import win32file
        import win32con
        PYWIN32_AVAILABLE = True
    except ImportError:
        pass

@dataclass(frozen=True)
class Timestamps:
    """Timestamps represented in nanoseconds."""
    accessed: int
    modified: int
    created: int | None     # Not available on Linux

    def __post_init__(self):
        def validateField(name: str, value: int | None, allow_none: bool = False) -> None:
            if value is None and allow_none:
                return

            if not isinstance(value, int):
                raise ValueError(f"\"{name}\" variable cannot be {type(value)}, expected int.")
            
            if value < 0:
                raise ValueError(f"\"{name}\" variable cannot be smaller than 0. Received: {value}")

        validateField("accessed", self.accessed)
        validateField("modified", self.modified)
        validateField("created", self.created, allow_none=True)

def getTimestamps(src_path: str) -> Timestamps:
    """Returns a Timestamps object. Can raise OSError and Exception."""
    if not os.path.isfile(src_path):
        raise FileNotFoundError("File not found, cannot extract timestamps.")

    try:
        stat = os.stat(src_path)
        return Timestamps(
            accessed=stat.st_atime_ns,
            modified=stat.st_mtime_ns,
            created=stat.st_birthtime_ns if hasattr(stat, "st_birthtime_ns") else None,     # None on Linux
        )
    except (OSError, ValueError) as e:
        raise Exception(f"getTimestamps failed. {e}")

def applyTimestamps(dst_path: str, timestamps: Timestamps) -> None:
    """Applies timestamps. Can raise OSError and Exception."""
    if not os.path.isfile(dst_path):
        raise FileNotFoundError("File not found, cannot apply timestamps.")
    
    if (
        platform.system() == "Windows" and
        timestamps.created and
        PYWIN32_AVAILABLE
    ):
        handle = None
        try:
            handle = win32file.CreateFile(
                dst_path,
                win32con.GENERIC_WRITE,
                0,
                None,
                win32con.OPEN_EXISTING,
                0,
                None
            )
            win32file.SetFileTime(
                handle,
                pywintypes.Time(timestamps.created / 1e9),
                pywintypes.Time(timestamps.accessed / 1e9),
                pywintypes.Time(timestamps.modified / 1e9),
            )
        except Exception as e:
            raise OSError(f"Applying timestamps with win32file failed. {e}")
        finally:
            if handle:
                handle.Close()
    # elif platform.system() == "Darwin": # For future implementation.
    else:       # Generic
        try:
            os.utime(
                dst_path,
                ns=(timestamps.accessed, timestamps.modified),
            )
        except OSError as e:
            raise Exception(f"Applying timestamps with os.utime failed. {e}")
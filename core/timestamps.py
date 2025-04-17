from contextlib import contextmanager
from dataclasses import dataclass
import platform
import os
import ctypes
from ctypes import wintypes, byref     # ctypes requires explicit imports for wintypes

IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

    GENERIC_WRITE       = 0x40000000
    FILE_SHARE_READ     = 0x00000001
    FILE_SHARE_WRITE    = 0x00000002
    OPEN_EXISTING       = 3
    EPOCH_AS_FILETIME   = 116444736000000000    # 100-ns ticks between 1601-01-01 and 1970-01-01.
    INVALID_HANDLE      = wintypes.HANDLE(-1).value

    class FILETIME(ctypes.Structure):
        _fields_ = [
            ("dwLowDateTime", wintypes.DWORD),
            ("dwHighDateTime", wintypes.DWORD),
        ]
    
    def _unix_to_filetime_ns(ns: int) -> FILETIME:
        ticks = ns // 100
        ft = ticks + EPOCH_AS_FILETIME
        return FILETIME(
            dwLowDateTime=ft & 0xFFFFFFFF,
            dwHighDateTime=ft >> 32,
        )

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
    except OSError as e:
        raise OSError(f"Cannot extract timestamps. {e}")

    try:
        return Timestamps(
            accessed=stat.st_atime_ns,
            modified=stat.st_mtime_ns,
            created=getattr(stat, "st_birthtime_ns", None),     # None on Linux
        )
    except ValueError as e:
        raise Exception(f"Timestamps validation failed. {e}")

@contextmanager
def _win32_handle(path: str):
    handle = kernel32.CreateFileW(
        path,
        GENERIC_WRITE,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        None,
        OPEN_EXISTING,
        0,
        None
    )
    if handle == INVALID_HANDLE:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        yield handle
    finally:
        kernel32.CloseHandle(handle)

def applyTimestamps(dst_path: str, timestamps: Timestamps) -> None:
    """Applies timestamps. Can raise OSError."""
    if not os.path.isfile(dst_path):
        raise FileNotFoundError("File not found, cannot apply timestamps.")
    
    if (
        IS_WINDOWS and
        timestamps.created is not None
    ):
        with _win32_handle(dst_path) as h:
            ok = kernel32.SetFileTime(
                h,
                byref(_unix_to_filetime_ns(timestamps.created)),
                byref(_unix_to_filetime_ns(timestamps.accessed)),
                byref(_unix_to_filetime_ns(timestamps.modified)),
            )
            if not ok:
                raise ctypes.WinError(ctypes.get_last_error())
    else:
        try:
            os.utime(
                dst_path,
                ns=(timestamps.accessed, timestamps.modified),
            )
        except OSError as e:
            raise OSError(f"Applying timestamps with os.utime failed. {e}")
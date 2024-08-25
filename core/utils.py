import shutil
import os
import logging
from pathlib import Path
from typing import List, Any

def scanDir(path: str) -> list:
    """Recursively scan a directory for files. Returns paths or raises FileNotFoundError If a directory was not found."""
    if not os.path.exists(path):
        raise FileNotFoundError(path)

    files = []
    for i in Path(path).rglob("*"):
        if os.path.isdir(i) == False:
            files.append(os.path.abspath(i))    # Convert POSIX path to str
    return files

def dictToList(data: dict):
    """Convert a dictionary into a list of tuples."""
    result = []
    for k, v in data.items():
        if isinstance(v, dict):
            v = dictToList(v)
        result.append(
            (k, v)
        )
    return result

def clip(val, _min, _max):
    """Limit value to a given range."""
    if val > _max:
        return _max
    elif val < _min:
        return _min
    else:
        return val

def getFreeSpaceLeft(path: str) -> int:
    """Returns free space left on the device in bytes, or -1 if it cannot be determined."""
    try:
        total, used, free = shutil.disk_usage(path)
        return free
    except Exception as e:
        logging.error(f"[getFreeSpaceLeft] {e}")
        return -1
from typing import Any, Union
from collections.abc import Hashable

def removeDuplicatesHashable(data: list[Hashable]) -> list[Hashable]:
    """Removes duplicates from a list while preserving order. All entries must be hashable.
    
    Hashable: str, int, float, tuple
    Unhashable: list, dict, set
    """ 
    return list(dict.fromkeys(data))

def listToFilter(title: str, ext: list[str]) -> str:
    """Convert a list of extensions into a name filter for file dialogs."""
    if len(ext) == 0:
        return f"All Files (*)"
    
    last_idx = len(ext) - 1

    output = f"{title} ("
    for i in range(last_idx):
        output += f"*.{ext[i]} "

    output += f"*.{ext[last_idx]})" # Last one (no space at the end)
    return output
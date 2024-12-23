import re

from data.constants import (
    IMAGE_MAGICK_PATH,
)
from core.convert import runBinary
from core.exceptions import GenericException, FileException

def checkForConflicts(ext: str, file_format: str, downscaling=False) -> None:
    """
    Checks for conflicts with animated images. Raises exceptions and returns True If any conflicts occur. 
    
    Args:
    - ext - extension (without a dot in the beginning and lowercase)
    - file_format - target format (uppercase)
    - downscaling - is downscaling on
    """
    if ext == "gif":
        conflict = True

        # Animation
        if file_format in ("JPEG XL", "WebP"):
            conflict = False
        
        if conflict:
            raise GenericException("CF0", f"{ext.upper()} -> {file_format} conversion is not supported")

        if downscaling:
            raise GenericException("CF1", f"Downscaling is not supported for animation")

def checkForMultipage(src_ext: str, src_abs_path: str) -> None:
    """Raises an exception if an image is multipage."""
    if src_ext in ("tif", "tiff"):
        stdout, stderr = runBinary(
            IMAGE_MAGICK_PATH,
            ["identify", "-format", "%n\n"],
            src_abs_path
        )
        try:
            layers_re = re.search(r"\d+", stdout)
            layers_n = int(layers_re.group(0))
        except Exception:
            raise FileException("CF2", f"Cannot detect the number of pages. {stderr}")

        if layers_n != 1:
            raise FileException("CF3", "Multipage images are not supported.")
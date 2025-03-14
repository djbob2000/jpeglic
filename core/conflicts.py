import re

from data.constants import (
    IMAGE_MAGICK_PATH,
)
from core.convert import runBinary, getImageCount
from core.exceptions import GenericException, FileException

def checkForConflicts(src_ext: str, src_image_path: str, target_format: str, downscaling: bool = False) -> None:
    """
    Checks for conflicts with animated images. Raises exceptions and returns True if any conflicts occur. 
    
    Args:
        - src_ext - extension (without a dot in the beginning and lowercase)
        - src_image_path - path to source image
        - target_format - target format
        - downscaling - is downscaling enabled

    Exceptions:
        - GenericException - for unsupported transcoding.
        - FileException - for file-related exceptions.

    """
    if src_ext in ("gif", "apng"):
        # Animation
        valid_routines = {
            "gif": ["JPEG XL", "WebP"],
            "apng": ["JPEG XL"],
        }

        if target_format not in valid_routines[src_ext]:
            raise GenericException("CF0", f"Transcoding {src_ext.upper()} -> {target_format} is not supported")

        if downscaling:
            raise GenericException("CF1", f"Downscaling is not supported for animation")
    elif src_ext in ("tif", "tiff", "webp"):

        # Multipage images
        page_num, err = getImageCount(src_image_path)
        if page_num < 1:
            raise FileException("CF2", f"Cannot detect image's page count. {err}")

        if page_num > 1:
            if src_ext == "webp":
                err_msg = "Animated WebP is not supported as input."
            else:
                err_msg = "Multipage images are not supported."
            raise GenericException("CF3", err_msg)
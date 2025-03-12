import re

from data.constants import (
    IMAGE_MAGICK_PATH,
)
from core.convert import runBinary, getImagePageNum
from core.exceptions import GenericException, FileException

def checkForConflicts(src_ext: str, src_image_path: str, target_format: str, downscaling: bool = False) -> None:
    """
    Checks for conflicts with animated images. Raises exceptions and returns True If any conflicts occur. 
    
    Args:
    - src_ext - extension (without a dot in the beginning and lowercase)
    - src_image_path - path to source image
    - target_format - target format
    - downscaling - is downscaling on
    """
    conflict = True

    if src_ext == "gif":

        # Animation
        if target_format in ("JPEG XL", "WebP"):
            conflict = False
        
        if conflict:
            raise GenericException("CF0", f"{src_ext.upper()} -> {target_format} conversion is not supported")

        if downscaling:
            raise GenericException("CF1", f"Downscaling is not supported for animation")
    elif src_ext in ("tif", "tiff", "webp"):

        # Multipage images
        page_num, err = getImagePageNum(src_image_path)
        if page_num < 1:
            raise FileException("CF2", f"Cannot detect the number of pages. {err}")

        if page_num > 1:
            if src_ext == "webp":
                err_msg = "Animated WebP is not supported as input."
            else:
                err_msg = "Multipage images are not supported."
            raise FileException("CF3", err_msg)
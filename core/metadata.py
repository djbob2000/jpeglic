import platform

from data.constants import (
    EXIFTOOL_PATH,
    IMAGE_MAGICK_PATH,
    CJXL_PATH,
    AVIFENC_PATH,
    OXIPNG_PATH
)
from core.process import runProcess, runProcessOutput
from core.exceptions import GenericException

class Data:
    exiftool_available = None   # None - unchecked; False - not available; True - available;

def runExifTool(src: str, dst: str, metadata_mode: str, dict_w_args: {}) -> None:
    """Runs ExifTool.

    Args:
        src: str - absolute path to source
        dst: str - absolute path to destination
        metadata_mode: str - chosen ExifTool metadata mode
        dict_w_args: {} - dictionary with ExifTool arguments

    Example:
        runExifTool(
            "/path/to/src.jpg",
            "/path/to/dst.jxl",
            ["-all=", "-overwrite_original", "$dst"],
            "ExifTool - Wipe",
            {"ExifTool - Wipe": "exiftool_wipe"}
        )
    """
    # Map
    exiftool_map = {
        "ExifTool - Wipe": "exiftool_wipe",
        "ExifTool - Preserve": "exiftool_preserve",
        "ExifTool - Custom": "exiftool_custom",
    }
    try:
        _args = dict_w_args[exiftool_map[metadata_mode]]
    except KeyError as e:
        raise GenericException("M0", f"Metadata command not mappped. {e}")

    # Prepare args
    cmd = _args.strip().split(" ")
    for idx, val in enumerate(cmd):
        match val:
            case "$src":
                cmd[idx] = src
            case "$dst":
                cmd[idx] = dst
    
    # Run
    _runExifTool(*cmd)

def isExifToolAvailable() -> bool | None:
    """Checks if ExifTool is available. Unix-only."""
    if Data.exiftool_available is not None:
        return Data.exiftool_available

    match platform.system():
        case "Linux":
            Data.exiftool_available = not "not found" in runProcessOutput("bash", "-c", "type exiftool")[0]
        case _:
            Data.exiftool_available = True
   
    return Data.exiftool_available

def _runExifTool(*args):
    """For internal use only."""
    if platform.system() == "Windows":
        runProcess(EXIFTOOL_PATH, *args)
    elif platform.system() == "Linux":
        runProcess("exiftool", *args)
        # ExifTool is no longer included due to a bug in its handling of JPEG XL on Linux.
        # If you try to process JPEG XL from Worker using the standalone ExifTool build, you get:
        # (stderr): Warning: Install IO::Uncompress::Brotli to decode Brotli-compressed metadata
        # To reproduce it, checkout `v1.0.1` tag and copy the binaries over from the official release.
        
def getArgs(encoder, mode, jpg_to_jxl_lossless=False) -> list:
    """Return metadata arguments for the specified encoder.

    Example Usage:
        args = []
        args.extend(getArgs(encoder, mode))
    """
    match mode:
        case "Encoder - Wipe":
            if encoder == CJXL_PATH:
                if not jpg_to_jxl_lossless:
                    return ["-x strip=exif", "-x strip=xmp", "-x strip=jumbf"]    
                else:
                    return []
            elif encoder == IMAGE_MAGICK_PATH:
                return ["-strip"]
            elif encoder == AVIFENC_PATH:
                return  ["--ignore-exif", "--ignore-xmp"]
            elif encoder == OXIPNG_PATH:
                return ["--strip safe"]
            else:
                return []   # DJXL, CJPEGLI, AVIFDEC - unavailable or undocumented
        case "Encoder - Preserve":
            return []   # Encoders preserve metadata by default
        case _:
            return []
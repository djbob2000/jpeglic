import platform
import tempfile
import os

from data.constants import (
    EXIFTOOL_PATH,
    IMAGE_MAGICK_PATH,
    CJXL_PATH,
    AVIFENC_PATH,
    OXIPNG_PATH
)
from core.process import runProcess, runProcessOutput
from core.exceptions import GenericException, FileException

class Data:
    exiftool_available = None   # None - unchecked; False - not available; True - available;

def runExifTool(src: str, dst: str, et_args: list[str]) -> None:
    """Runs ExifTool.

    Args:
        src: str - absolute path to source
        dst: str - absolute path to destination
        et_args: list[str] - ExifTool arguments

    Example:
        runExifTool(
            "/path/to/src.jpg",
            "/path/to/dst.jxl",
            ["-all=", "-overwrite_original", "$dst"],
        )
    """
    # Prepare args
    cmd = et_args
    for idx, val in enumerate(cmd):
        match val:
            case "$src":
                cmd[idx] = src
            case "$dst":
                cmd[idx] = dst
    
    # Run
    _runExifTool(*cmd)

def _runExifTool(*args):
    """For internal use only."""
    if platform.system() == "Windows":
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", delete=False, suffix=".txt") as tmp_file:
                tmp_file_path = tmp_file.name
                tmp_file_name = os.path.basename(tmp_file_path)
                tmp_file_dir = os.path.dirname(tmp_file_path)

                tmp_file.write("\n".join(args))
        except Exception as e:
            raise FileException("M0", f"Failed to create an argfile. {e}")
        
        runProcess(EXIFTOOL_PATH, "-charset", "filename=UTF8", "-@", tmp_file_name, cwd=tmp_file_dir)

        try:
            os.unlink(tmp_file_path)
        except Exception as e:
            raise FileException("M1", f"Failed to clean up an argfile.")
        # ExifTool does not support UTF-8 paths on Windows, unless you put them in an argfile.
    elif platform.system() == "Linux":
        runProcess("exiftool", *args)
        # ExifTool is no longer included due to a bug in its handling of JPEG XL on Linux.
        # If you try to process JPEG XL from Worker using the standalone ExifTool build, you get:
        # (stderr): Warning: Install IO::Uncompress::Brotli to decode Brotli-compressed metadata
        # To reproduce it, checkout `v1.0.1` tag and copy the binaries over from the official release.

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
import os

from PySide6.QtCore import (
    QMutexLocker,
)

import data.task_status as task_status
from data.constants import (
    IMAGE_MAGICK_PATH,
    ALLOWED_RESAMPLING,
)
from core.utils import clip
from core.pathing import getUniqueTmpFilePath
import core.metadata as metadata
from core.convert import convert, getDecoder
from core.exceptions import CancellationException, GenericException, FileException

# ------------------------------------------------------------
#                           Math
# ------------------------------------------------------------

def _linearRegression(x, y):
    """Identical to numpy.polyfit(x, y, 1)."""
    n = len(x)
    mean_x, mean_y = sum(x) / n, sum(y) / n

    numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    denominator = sum((x[i] - mean_x)**2 for i in range(n))

    slope = numerator / denominator if denominator != 0 else 0
    intercept = mean_y - slope * mean_x

    return slope, intercept

def _extrapolateScale(sample_points, desired_size) -> int:
    """
    Returns estimated percentage the image should be scaled to.

    parameters:
        sample_data - [[size_in_bytes, percentage], [size, prcnt]]
        desired_size - desired size in bytes
    """

    x, y = zip(*sample_points)
    slope, intercept = _linearRegression(x, y)

    x_new = desired_size
    y_new = slope * x_new + intercept

    return int(y_new)

# ------------------------------------------------------------
#                           Helper
# ------------------------------------------------------------

def _downscaleToPercent(src, dst, amount=90, resample="Default", n=None):
    amount = clip(amount, 1, 100)

    args = []
    if resample != "Default" and resample in ALLOWED_RESAMPLING:
        args.append(f"-filter {resample}")  # Needs to come first
    args.extend([f"-resize {amount}%"])

    convert(IMAGE_MAGICK_PATH, src, dst, args, n)

def cancelCheck(*tmp_files):
    """Checks if the task was canceled and removes temporary files."""
    if task_status.wasCanceled():
        for file in tmp_files:
            try:
                os.remove(file)
            except OSError as err:
                raise FileException("D5", err)
        raise CancellationException()

# ------------------------------------------------------------
#                           Scaling
# ------------------------------------------------------------

def _downscaleToFileSize(params, mutex):
    # Prepare data
    fault_tolerance = 0.1    # 0.1 is 10%
    size_samples = []
    with QMutexLocker(mutex):
        proxy_src = getUniqueTmpFilePath(params["dst_dir"], "png")

    # JPEG XL - intelligent effort
    if params["format"] == "JPEG XL" and params["jxl_int_e"]:
        params["args"][1] = "-e 7"

    # Sample 2 data points (evenly)
    _downscaleToPercent(params["src"], proxy_src, 66, params["resample"], params["n"])
    convert(params["enc"], proxy_src, params["dst"], params["args"], params["n"])

    try:
        size_samples.append([os.path.getsize(params["dst"]), 66])
    except OSError as err:
        try:
            os.remove(proxy_src)
            os.remove(params["dst"])
        except OSError as err:
            raise FileException("D7", err)
        raise FileException("D6", err)

    cancelCheck(proxy_src, params["dst"])

    if not os.path.isfile(params["dst"]):  # Failed conversion check (in case of corrupt images)
        try:
            os.remove(proxy_src)
            os.remove(params["dst"])
        except OSError as err:
            raise FileException("D8", err)
        raise FileException("D9", f"Failed conversion check. {err}")

    _downscaleToPercent(params["src"], proxy_src, 33, params["resample"], params["n"])
    convert(params["enc"], proxy_src, params["dst"], params["args"], params["n"])

    try:
        size_samples.append([os.path.getsize(params["dst"]), 33])
    except OSError as err:
        try:
            os.remove(proxy_src)
        except OSError as err:
            raise FileException("D10", err)
        raise FileException("D11", f"Getting file sizes failed. {err}")

    try:
        os.remove(params["dst"])
    except OSError as err:
        raise FileException("D12", err)

    cancelCheck(proxy_src)

    # Use gathered data
    extrapolated_scale = _extrapolateScale(size_samples, params["max_size"] * 1024)

    if extrapolated_scale < 0:          # Error
        
        try:
            os.remove(proxy_src)
        except OSError as err:
            raise FileException("D13", err)
        raise GenericException("D14", f"Extrapolated scale cannot be negative ({extrapolated_scale})")
    elif extrapolated_scale >= 100:     # Non-downscaled conversion
        
        convert(params["enc"], params["src"], params["dst"], params["args"], params["n"])
        try:
            os.remove(proxy_src)
        except OSError as err:
            raise FileException("D15", err)
        return True
    else:
        while True:
            _downscaleToPercent(params["src"], proxy_src, extrapolated_scale, params["resample"], params["n"])
            convert(params["enc"], proxy_src, params["dst"], params["args"], params["n"])

            extrapolated_scale -= 10
            
            try:
                size = os.path.getsize(params["dst"])
                threshold = params["max_size"] * 1024 * (1 + fault_tolerance)
                if size < threshold:
                    break
            except OSError as err:
                try:
                    os.remove(proxy_src)
                    os.remove(params["dst"])
                except OSError as err:
                    raise FileException("D17", err)
                raise FileException("D16", err)

            cancelCheck(proxy_src, params["dst"])
        
        # JPEG XL - intelligent effort
        if params["format"] == "JPEG XL" and params["jxl_int_e"]:
            params["args"][1] = "-e 9"
            with QMutexLocker(mutex):
                e9_tmp = getUniqueTmpFilePath(params["dst_dir"], "jxl")

            convert(params["enc"], proxy_src, e9_tmp, params["args"], params["n"])

            try:
                e7_size = os.path.getsize(params["dst"])
                e9_size = os.path.getsize(e9_tmp)
                if e9_size < e7_size:
                    os.remove(params["dst"])
                    os.rename(e9_tmp, params["dst"])
                else:
                    os.remove(e9_tmp)
            except OSError as err:
                raise FileException("D18", err)
            
        # Cleanup
        try:
            os.remove(proxy_src)
        except OSError as err:
            raise FileException("D19", err)

        return True

def _downscaleManualModes(params, mutex):
    """Internal wrapper for all regular downscaling modes."""
    # Set arguments
    args = []
    if params['resample'] != "Default" and params['resample'] in ALLOWED_RESAMPLING:
        args.append(f"-filter {params['resample']}")
    
    match params["mode"]:
        case "Percent":
            args.append(f"-resize {params['percent']}%")

        case "Resolution":
            if params['width'] != float("inf") and params['height'] != float("inf"):
                args.append(f"-resize {params['width']}x{params['height']}>")
            elif params['width'] != float("inf"):
                args.append(f"-resize {params['width']}x>")
            elif params['height'] != float("inf"):
                args.append(f"-resize x{params['height']}>")
            else:
                raise GenericException("D20", "Expected downscaling disabled.")

        case "Shortest Side":
            args.append(f"-resize {params['shortest_side']}x{params['shortest_side']}^>")

        case "Longest Side":
            args.append(f"-resize {params['longest_side']}x{params['longest_side']}>")

        case "Megapixels":
            megapixels = int(params['megapixels'] * 1_000_000)
            args.append(f"-resize {megapixels}@>")
            
        case _:
            raise GenericException("D2", f"Downscaling mode not recognized ({params['mode']})")
    
    # Downscale
    if params["enc"] == IMAGE_MAGICK_PATH:  # We can just add arguments If the encoder is ImageMagick, since it also handles downscaling
        args.extend(params["args"])
        convert(IMAGE_MAGICK_PATH, params["src"], params["dst"], args, params["n"])
    else:
        with QMutexLocker(mutex):
            downscaled_path = getUniqueTmpFilePath(params["dst_dir"], "png")

        # Downscale
        # Proxy was handled before in Worker.py
        convert(IMAGE_MAGICK_PATH, params["src"], downscaled_path, args, params["n"])
        
        # Convert
        if params["format"] == "JPEG XL" and params["jxl_int_e"]: 
            params["args"][1] == "-e 7"

        convert(params["enc"], downscaled_path, params["dst"], params["args"], params["n"])

        # Intelligent Effort
        if params["format"] == "JPEG XL" and params["jxl_int_e"]: 
            params["args"][1] = "-e 9"

            with QMutexLocker(mutex):
                e9_tmp = getUniqueTmpFilePath(params["dst_dir"], "jxl")
            convert(params["enc"], downscaled_path, e9_tmp, params["args"], params["n"])

            try:
                e7_size = os.path.getsize(params["dst"])
                e9_size = os.path.getsize(e9_tmp)

                if e9_size < e7_size:
                    os.remove(params["dst"])
                    os.rename(e9_tmp, params["dst"])
                else:
                    os.remove(e9_tmp)

            except OSError as err:
                raise FileException("D3", err)

        # Clean-up
        try:
            os.remove(downscaled_path)
        except OSError as err:
            raise FileException("D4", err)

# ------------------------------------------------------------
#                           Public
# ------------------------------------------------------------

def decodeAndDownscale(params, ext, metadata_mode, mutex):
    """Decode to PNG with downscaling support."""
    params["enc"] = getDecoder(ext)
    params["args"] = metadata.getArgs(params["enc"], metadata_mode)

    if params["enc"] == IMAGE_MAGICK_PATH:
        downscale(params, mutex)
    else:
        # Generate proxy
        with QMutexLocker(mutex):
            proxy_path = getUniqueTmpFilePath(params["dst_dir"], "png")
        convert(params["enc"], params["src"], proxy_path, [], params["n"])

        # Downscale
        params["src"] = proxy_path
        params["enc"] = IMAGE_MAGICK_PATH
        downscale(params, mutex)

        # Clean-up
        try:
            os.remove(proxy_path)
        except OSError as err:
            raise FileException("D1", err)

def downscale(params, mutex):
    """A wrapper for all downscaling methods. Keeps the same aspect ratio.
    
        "mode" - downscaling mode
        "enc" - encoder path
        "jxl_int_e" - An exception to handle intelligent effort
        "src" - source PNG absolute path
        "dst" - destination absolute path
        "dst_dir": - destination directory
        "name" - item name
        "args" - encoder arguments

        File Size
        "step" - takes % (e.g. 10%). Keep between 5% - 20%
        "max_size" - desired size - takes KiB (e.g. 500 KiB)

        Percent
        "percent" - downscale by that amount

        Max Size
        "width" - max width in px
        "height" - max height in px
        
        Misc
        "resample": - resampling method
        "n" - worker number
    """
    if task_status.wasCanceled():
        raise CancellationException()
    
    if params["mode"] == "File Size":
        _downscaleToFileSize(params, mutex)
    else:
        _downscaleManualModes(params, mutex)
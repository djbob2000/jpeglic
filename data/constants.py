import os
import platform
import sys
import logging

from data.utils import removeDuplicatesHashable, listToFilter

VERSION = "1.1.0"
UPDATE_CHECKER_VER_FILE_URL = "https://codepoems.eu/downloads/xl-converter/version.json"   # Used by UpdateChecker; example in misc/version.json
UPDATE_CHECKER_ENABLED = True

# Filled below
CONFIG_LOCATION = ""
PROGRAM_FOLDER = sys._MEIPASS if getattr(sys, "frozen", False) else os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
LICENSE_PATH = os.path.join(PROGRAM_FOLDER, "LICENSE.txt")
LICENSE_3RD_PARTY_PATH = os.path.join(PROGRAM_FOLDER, "LICENSE_3RD_PARTY.txt")
ICON_SVG = os.path.join(PROGRAM_FOLDER, "assets", "icons", "logo.svg")
FINISHED_SOUND_PATH = os.path.join(PROGRAM_FOLDER, "assets", "sounds", "finished.wav")
LOGS_DIR = ""
ASSETS_ICONS_DIR = os.path.join(PROGRAM_FOLDER, "assets", "icons")
ASSETS_FONTS_DIR = os.path.join(PROGRAM_FOLDER, "assets", "fonts")

CJXL_PATH = "cjxl"
DJXL_PATH = "djxl"
JXLINFO_PATH = "jxlinfo"
CJPEGLI_PATH = "cjpegli"
IMAGE_MAGICK_PATH = "magick"
AVIFENC_PATH = "avifenc"
AVIFDEC_PATH = "avifdec"
OXIPNG_PATH = "oxipng"
EXIFTOOL_PATH = "exiftool"
JPEGTRAN_PATH = "jpegtran"

if platform.system() == "Windows":
    BASE_PATH = os.path.join(PROGRAM_FOLDER, "bin", "win")

    CJXL_PATH = os.path.join(BASE_PATH, "cjxl.exe")
    DJXL_PATH = os.path.join(BASE_PATH, "djxl.exe")
    JXLINFO_PATH = os.path.join(BASE_PATH, "jxlinfo.exe")
    CJPEGLI_PATH = os.path.join(BASE_PATH, "cjpegli.exe")
    IMAGE_MAGICK_PATH = os.path.join(BASE_PATH, "imagemagick", "magick.exe")
    AVIFENC_PATH = os.path.join(BASE_PATH, "libavif", "avifenc.exe")
    AVIFDEC_PATH = os.path.join(BASE_PATH, "libavif", "avifdec.exe")
    OXIPNG_PATH = os.path.join(BASE_PATH, "oxipng.exe")
    EXIFTOOL_PATH = os.path.join(BASE_PATH, "exiftool", "exiftool.exe")
    JPEGTRAN_PATH = os.path.join(BASE_PATH, "jpegtran", "jpegtran.exe")

    CONFIG_LOCATION = os.path.normpath(os.path.expanduser("~/AppData/Local/xl-converter"))
elif platform.system() == "Linux":
    BASE_PATH = f"{PROGRAM_FOLDER}/bin/linux"

    CJXL_PATH = f"{BASE_PATH}/cjxl"
    DJXL_PATH = f"{BASE_PATH}/djxl"
    JXLINFO_PATH = f"{BASE_PATH}/jxlinfo"
    CJPEGLI_PATH = f"{BASE_PATH}/cjpegli"
    IMAGE_MAGICK_PATH = f"{BASE_PATH}/imagemagick/magick"
    AVIFENC_PATH = f"{BASE_PATH}/avifenc"
    AVIFDEC_PATH = f"{BASE_PATH}/avifdec"
    OXIPNG_PATH = f"{BASE_PATH}/oxipng"
    JPEGTRAN_PATH = os.path.join(BASE_PATH, "jpegtran")

    CONFIG_LOCATION = os.path.expanduser('~/.config/xl-converter')

LOGS_DIR = os.path.join(CONFIG_LOCATION, "logs")

# Proper usage is "if 'extension'.lower() in ALLOWED_INPUT:"
JPEG_ALIASES = ["jpg", "jpeg", "jfif", "jif", "jpe"]
ALLOWED_INPUT_DJXL = ["jxl"]
ALLOWED_INPUT_CJXL = JPEG_ALIASES + ["png", "gif", "jxl"]
ALLOWED_INPUT_CJPEGLI = JPEG_ALIASES + ["png", "jxl"]
ALLOWED_INPUT_IMAGE_MAGICK = JPEG_ALIASES + ["png", "gif", "webp", "jp2", "bmp", "ico", "tiff", "tif"]
ALLOWED_INPUT_AVIFENC = JPEG_ALIASES + ["png"]
ALLOWED_INPUT_AVIFDEC = ["avif"]
ALLOWED_INPUT_OXIPNG = ["png"]
ALLOWED_INPUT = removeDuplicatesHashable(ALLOWED_INPUT_DJXL + ALLOWED_INPUT_CJXL + ALLOWED_INPUT_IMAGE_MAGICK + ALLOWED_INPUT_AVIFENC + ALLOWED_INPUT_AVIFDEC + ALLOWED_INPUT_OXIPNG)
ALLOWED_RESAMPLING = ("Lanczos", "Point", "Box", "Cubic", "Hermite", "Gaussian", "Catrom", "Triangle", "Quadratic", "Mitchell", "CubicSpline", "Hamming", "Parzen", "Blackman", "Kaiser", "Welsh", "Hanning", "Bartlett", "Bohman")

ALLOWED_INPUT_FILTERS = [
    listToFilter("Supported Images", ALLOWED_INPUT),
    listToFilter("AVIF", ["avif"]),
    listToFilter("BMP", ["bmp"]),
    listToFilter("GIF", ["gif"]),
    listToFilter("ICO", ["ico"]),
    listToFilter("JPEG", JPEG_ALIASES),
    listToFilter("JPEG XL", ["jxl"]),
    listToFilter("JPEG2000", ["jp2"]),
    listToFilter("PNG", ["png"]),
    listToFilter("TIFF", ["tiff", "tif"]),
    listToFilter("WebP", ["webp"]),
]

import logging
from contextlib import ExitStack
from unittest.mock import patch, MagicMock

import pytest

import data.font_loader as font_loader

def test_init_happy_path(caplog, app):
    mock_fonts = [
        "OpenSans-Light.ttf",
        "OpenSans-Regular.ttf",
        "OpenSans-Medium.ttf",
    ]
    with (
        patch("data.font_loader.QFontDatabase.addApplicationFont", return_value=1) as mock_addApplicationFont,
        patch("data.font_loader.fonts", mock_fonts),
        caplog.at_level(logging.ERROR),
    ):
        font_loader.init()

        assert mock_addApplicationFont.call_count == len(mock_fonts)
        for count, mock_font in enumerate(mock_fonts):
            assert mock_font in mock_addApplicationFont.call_args_list[count][0][0]
        assert not caplog.text

def test_init_sad_path(caplog, app):
    with (
        patch("data.font_loader.QFontDatabase.addApplicationFont", return_value=-1) as mock_addApplicationFont,
        patch("data.font_loader.fonts", ["OpenSans-Light.ttf"]),
        caplog.at_level(logging.ERROR),
    ):
        font_loader.init()

        assert caplog.records[0].message == "[Fonts] Failed to load OpenSans-Light.ttf"
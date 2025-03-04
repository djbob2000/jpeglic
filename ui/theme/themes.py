import logging

from .models import Theme, ThemeColors, ThemeIconPaths
from .utils import getIconPath

def __getDarkThemeIconPaths() -> ThemeIconPaths:
    return ThemeIconPaths(
        checkmark_svg_url = getIconPath("checkmark.svg"),
        drop_down_arrow_svg_url = getIconPath("drop_down_arrow.svg"),
        drop_down_arrow_disabled_svg_url = getIconPath("drop_down_arrow_disabled.svg"),
        up_arrow_svg_url = getIconPath("up_arrow.svg"),
        up_arrow_disabled_svg_url = getIconPath("up_arrow_disabled.svg"),
        down_arrow_svg_url = getIconPath("down_arrow.svg"),
        down_arrow_disabled_svg_url = getIconPath("down_arrow_disabled.svg"),
    )

def __getLightThemeIconPaths() -> ThemeIconPaths:
    return ThemeIconPaths(
        checkmark_svg_url=getIconPath("checkmark_light.svg"),
        drop_down_arrow_svg_url=getIconPath("drop_down_arrow_light.svg"),
        drop_down_arrow_disabled_svg_url = getIconPath("drop_down_arrow_disabled.svg"),
        up_arrow_svg_url = getIconPath("up_arrow_light.svg"),
        up_arrow_disabled_svg_url = getIconPath("up_arrow_disabled.svg"),
        down_arrow_svg_url=getIconPath("down_arrow_light.svg"),
        down_arrow_disabled_svg_url = getIconPath("down_arrow_disabled.svg"),
    )

def _getThemeRalsei() -> Theme:
    return Theme(
        name="Ralsei",
        colors=ThemeColors(
            accent_big="#00ff76",
            accent_small="#ff0066",
            font="#e9e9e9",
            font_disabled="#9A9A9A",
            canvas="#141414",
            border="#404040",
            progress_bar_text="#ff0066",
        ),
        icons=__getDarkThemeIconPaths()
    )

def _getThemeDarkAmber() -> Theme:
    return Theme(
        name="Dark Amber",
        colors=ThemeColors(
            accent_big="#F18000",
            accent_small="#F18000",
            font="#E4E7EB",
            font_disabled="#A1A1A1",
            canvas="#202124",
            border="#3F4042",
            progress_bar_text="#E4E7EB",
        ),
        icons=__getDarkThemeIconPaths()
    )

def _getThemeLightAmber() -> Theme:
    return Theme(
        name="Light Amber",
        colors=ThemeColors(
            accent_big="#F17400",
            accent_small="#F17400",
            font="#404040",
            font_disabled="#9198A3",
            canvas="#F8F9FA",
            border="#D8DADE",
            progress_bar_text="#404040",
        ),
        icons=__getLightThemeIconPaths()
    )

def getTheme(theme_name: str) -> Theme:
    match theme_name:
        case "Ralsei":
            return _getThemeRalsei()

        case "Dark Amber":
            return _getThemeDarkAmber()
            
        case "Light Amber":
            return _getThemeLightAmber()
        
        case _:
            logging.getLogger(__name__).error(f"Theme \"{theme_name}\" not found")
            return _getThemeRalsei()
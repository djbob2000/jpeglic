from dataclasses import dataclass

@dataclass
class ThemeColors:
    """All values are hex colors."""
    accent_big: str
    accent_small: str
    font: str
    font_disabled: str
    canvas: str
    border: str
    progress_bar_text: str

@dataclass
class ThemeIconPaths:
    checkmark_svg_url: str
    drop_down_arrow_svg_url: str
    drop_down_arrow_disabled_svg_url: str
    up_arrow_svg_url: str
    up_arrow_disabled_svg_url: str
    down_arrow_svg_url: str
    down_arrow_disabled_svg_url: str

@dataclass
class Theme:
    name: str
    colors: ThemeColors
    icons: ThemeIconPaths
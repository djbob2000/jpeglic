from PySide6.QtWidgets import QLabel, QApplication
from PySide6.QtCore import QEvent

# This component addresses the lack of support for styling `QLabel a` in QSS.

class StyledLabel(QLabel):
    _instances = []
    _style = ""

    def __init__(self, html_text: str):
        super().__init__()
        self.html_text = html_text
        
        StyledLabel._instances.append(self)
        self.setStyledText(html_text)

    @classmethod
    def updateStyleForAll(cls, css_style: str) -> None:
        cls._style = css_style
        for label in cls._instances:
            label.updateStyle()
    
    def updateStyle(self):
        self.setStyledText(self.html_text)
    
    def setStyledText(self, text: str):
        self.setText(f"""
        <style>
            {StyledLabel._style}
        </style>
        {text}
    """)
from PySide6.QtGui import QWheelEvent
from PySide6.QtWidgets import QSpinBox, QDoubleSpinBox

class SpinBox(QSpinBox):
    def wheelEvent(self, e: QWheelEvent) -> None:
        e.ignore()

class DoubleSpinBox(QDoubleSpinBox):
    def wheelEvent(self, e: QWheelEvent) -> None:
        e.ignore()
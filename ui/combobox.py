from PySide6.QtGui import QWheelEvent
from PySide6.QtWidgets import QComboBox, QWidget

class ComboBox(QComboBox):
    def __init__(self, items: tuple[str] | None = None, parent: QWidget | None = None):
        super().__init__(parent)
        if items:
            self.addItems(items)

    def wheelEvent(self, e: QWheelEvent) -> None:
        e.ignore()
    
    def showPopup(self) -> None:
        # This stops QAbstractItemView from shrinking too much.
        # On Windows, it has a tendency to shrink when QComboBox is placed in a certain layout combination (even if only 2 items are present).
        item_view = self.view()

        if item_view:
            item_count = self.count()
            if item_count > 0:
                item_height = item_view.sizeHintForRow(0)
                total_height = item_height * item_count
                max_height = item_height * self.maxVisibleItems()

                item_view.setMinimumHeight(min(total_height, max_height))
        
        super().showPopup()
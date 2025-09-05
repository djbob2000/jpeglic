from pathlib import Path
import logging
import random

from data.constants import ALLOWED_INPUT

class Items():
    def __init__(self):
        self.items = []
        self.item_count = 0
        self.completed_item_count = 0

    def parseData(self, order: str = "Original", *items) -> None:
        """Populate the structure with proper data."""
        for abs_path, anchor_path in items:
            abs_path = Path(abs_path)
            ext = abs_path.suffix[1:]
    
            if ext.lower() not in ALLOWED_INPUT:
                logging.error(f"[Items] Extension not allowed ({ext})")
                continue

            if not isinstance(anchor_path, Path):
                logging.error(f"[Items] anchor_path is not a Path object ({type(anchor_path)})")
                continue

            self.items.append(
                (
                    abs_path,
                    anchor_path,
                )
            )
        
        self.item_count = len(self.items)

        if order == "Random":
            # Improves time left accuracy
            random.shuffle(self.items)
        elif order == "Sequential":
            # Improves file access times on HDDs
            self.items.sort(key=lambda pair: (str(pair[0].parent).casefold(), pair[0].name.casefold()))

    def getItem(self, n) -> Path:
        return self.items[n]

    def getItemCount(self) -> int:
        return self.item_count

    def getCompletedItemCount(self) -> int:
        return self.completed_item_count
    
    def addCompletedItem(self):
        self.completed_item_count += 1

    def clear(self):
        self.items = []
        self.completed_item_count = 0
        self.item_count = 0

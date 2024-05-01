from statistics import mean
from pathlib import Path
import logging
import time

from data.constants import ALLOWED_INPUT

EST_TIME_TRAIL_RANGE = 30
TIME_LEFT_MAX_REFRESH_RATE_MS = 1000

class Items():
    def __init__(self):
        self.items = []
        self.item_count = 0
        self.completed_items = []

        self.completion_times = []
        self.prev_completion_time = None
        self.prev_time_left = None
        self.conv_start_time = None

        self.prev_rate_limited_text = None
        self.prev_rate_limited_ms = None

    def parseData(self, *items):
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

    def getItem(self, n) -> Path:
        return self.items[n]

    def getItemCount(self) -> int:
        return self.item_count

    def getCompletedItemCount(self) -> int:
        return len(self.completed_items)
    
    def startConversion(self):
        self.conv_start_time = time.time()

    def getTimeRemainingText(self) -> str:
        completed_len = self.getCompletedItemCount()
        if completed_len < 2:
            return "Time left: <calculating>"
        
        if self.conv_start_time:
            if self.conv_start_time > time.time() - 1:
                return "Time left: <calculating>"

        # Estimate
        remaining = (self.getItemCount() - completed_len) * mean(self.completion_times)
        if self.prev_time_left is not None:
            if not self.prev_time_left < remaining * 0.8 and not remaining < 15:
                remaining = 0.1 * remaining + 0.9 * self.prev_time_left
            # else: don't interpolate

        self.prev_time_left = remaining

        # Format
        d = int(remaining / (3600 * 24))
        h = int((remaining // 3600) % 24)
        m = int((remaining // 60) % 60)
        s = int(remaining % 60)
        
        output = ""
        if d:   output += f"{d} d "
        if h:   output += f"{h} h "
        if m:   output += f"{m} m "
        if s:   output += f"{s} s"

        if output == "":
            output = "Almost done..."
        else:
            output += " left"

        return output
        
    def appendCompletionTime(self, n: float):
        if self.prev_completion_time != None:
            self.completion_times.append(n - self.prev_completion_time)
            if EST_TIME_TRAIL_RANGE < len(self.completion_times):
                self.completion_times.pop(0)

        self.prev_completion_time = n

    def appendCompletedItem(self, n):
        self.completed_items.append(n)
    
    def clear(self):
        self.items = []
        self.completed_items = []
        self.item_count = 0
        self.completion_times = []
        self.prev_completion_time = None
        self.prev_time_left = None
        self.prev_rate_limited_text = None
        self.prev_rate_limited_ms = None
        self.conv_start_time = None
    
    def getStatusText(self):
        out = f"Converted {self.getCompletedItemCount()} out of {self.getItemCount()} images\n"

        if self.getCompletedItemCount() < 2:
            out += self.getTimeRemainingText()
        else:
            out += self._getRateLimitedTimeRemainingText()
            
        return out

    def _getRateLimitedTimeRemainingText(self):
        cur_time_ms = time.time_ns() // 1_000_000
        time_left_text = None

        # Start values
        if self.prev_rate_limited_ms is None or self.prev_rate_limited_text is None:
            time_left_text = self.getTimeRemainingText()
            self.prev_rate_limited_ms = cur_time_ms
            self.prev_rate_limited_text = time_left_text

        # Limit updates
        if self.prev_rate_limited_ms < cur_time_ms - TIME_LEFT_MAX_REFRESH_RATE_MS:
            time_left_text = self.getTimeRemainingText()
            self.prev_rate_limited_text = time_left_text
            self.prev_rate_limited_ms = cur_time_ms
            return time_left_text
        else:
            return self.prev_rate_limited_text          # Use cached value
import logging
from dataclasses import dataclass
from typing import Literal, Optional
import os

from PySide6.QtCore import (
    QThreadPool,
)

import core.convert as convert

@dataclass
class OptimizationRule:
    applies_to: Literal["all", "JPEG XL", "SVT-AV1-PSY"]
    threshold_mp: float     # Threshold in megapixels
    thread_count: str       # "1" for single-worker; "1/2" for half of max threads

class RAMOptimizer:
    """Singleton for optimizing RAM. Not thread safe."""
    _instance: Optional["RAMOptimizer"] = None
    enabled: bool = False
    used_thread_count: Optional[int] = None
    rules: list[OptimizationRule] = []

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        RAMOptimizer.threadpool = QThreadPool.globalInstance()
        # Target: max ~1 GB per 1 thread
        RAMOptimizer.rules = [
            OptimizationRule("all", 6.0, "1/2"),
            OptimizationRule("all", 11.0, "1"),
        ]
    
    @classmethod
    def setEnabled(cls, enabled: bool) -> None:
        cls.enabled = enabled
    
    @classmethod
    def isEnabled(cls) -> bool:
        return cls.enabled

    @classmethod
    def setUsedThreadCount(cls, used_thread_count: int) -> None:
        """Set before using the optimizer."""
        cls.used_thread_count = used_thread_count

    @classmethod
    def setOptimizationRules(cls, rules: list[OptimizationRule]) -> None:
        cls.rules = rules

    @classmethod
    def _getOptimizedThreadCount(cls, current_res_mp: float, file_format: str, avif_encoder: str) -> int:
        """Interprets rules and returns new per-worker thread count."""
        for rule in sorted(cls.rules, key=lambda x: x.threshold_mp, reverse=True):
            if (
                current_res_mp >= rule.threshold_mp and
                (
                    rule.applies_to == "all" or
                    (rule.applies_to == file_format) or     # JPEG XL
                    (rule.applies_to == "AVIF" and avif_encoder == "SVT-AV1-PSY")
                )
            ):
                if rule.thread_count == "1":
                    return 1
                else:
                    num, den = rule.thread_count.split("/")
                    try:
                        num = int(num)
                        den = int(den)
                        optimized_thread_count = int(cls.used_thread_count * num / den)
                        if optimized_thread_count < 1:
                            optimized_thread_count = 1
                        return optimized_thread_count
                    except Exception:
                        logging.error(f"[RAM Optimizer - _getOptimizedThreadCount] Applying rule failed. ({rule.thread_count})")
                        return cls.used_thread_count
        
        # No rules applied
        return cls.used_thread_count

    @classmethod
    def run(cls,
        thread_count_per_worker: int,
        src_image_path: str,
        file_format: str,
        avif_encoder: str,
        jpeg_xl_effort: int,
        jpeg_xl_lossy_modular: bool,
        jpeg_xl_lossless: bool,
        jpeg_xl_intelligent_effort: bool,
    ) -> int:
        """Sets maximum thread count in the global QThreadPool instance and returns recalculated thread_count_per_worker. Not thread safe."""
        # Check if can run
        if not cls.enabled:
            logging.error("[RAM Optimizer - run] Cannot run while disabled.")
            return thread_count_per_worker

        if cls.used_thread_count is None:
            logging.error("[RAM Optimizer - run] used_thread_count not set.")
            return thread_count_per_worker
        
        # Check if applicable
        if not cls.isNecessary(
            file_format,
            avif_encoder,
            jpeg_xl_effort,
            jpeg_xl_lossy_modular,
            jpeg_xl_lossless,
            jpeg_xl_intelligent_effort
        ):
            return thread_count_per_worker

        # Get resolution
        width, height = convert.getImageResMp(src_image_path)
        
        if width < 0 or height < 0:     # Invalid
            cls.threadpool.setMaxThreadCount(cls.used_thread_count)
            return 1

        res_in_mp = (width * height) / 1_000_000

        # Interpret and apply rules
        optimized_thread_count = cls._getOptimizedThreadCount(res_in_mp, file_format, avif_encoder)
        cls.threadpool.setMaxThreadCount(optimized_thread_count)

        # Available_threads per worker
        try:
            new_thread_count_per_worker = cls.used_thread_count // optimized_thread_count
            if new_thread_count_per_worker <= 0:
                return 1
        except Exception:
            return 1

        # Return
        logging.info(f"[RAM Optimizer] Max concurrent workers: {optimized_thread_count}; threads per worker: {new_thread_count_per_worker}; src: {os.path.basename(src_image_path)}; res: {round(res_in_mp, 2)} MP")

        return new_thread_count_per_worker
    
    @staticmethod
    def isNecessary(
        dst_file_format: str,
        avif_encoder: str,
        jpeg_xl_effort: int,
        jpeg_xl_lossy_modular: bool,
        jpeg_xl_lossless: bool,
        jpeg_xl_intelligent_effort: bool,
    ) -> bool:
        """Returns if True if the optimizer is necessary."""
        if dst_file_format == "JPEG XL" and jpegXlHighRamUsage(jpeg_xl_effort, jpeg_xl_lossy_modular, jpeg_xl_lossless, jpeg_xl_intelligent_effort):
            return True
        
        if dst_file_format == "AVIF" and avif_encoder == "SVT-AV1-PSY":
            return True
        
        return False

def jpegXlHighRamUsage(effort: int, lossy_modular: bool, lossless: bool, intelligent_effort: bool) -> bool:
    if lossy_modular:
        return True
    
    if lossless and effort <= 9:
        return False

    if lossless and 10 > effort:
        return True
    
    if not lossless and effort <= 7 and not intelligent_effort:
        return False
    
    return True
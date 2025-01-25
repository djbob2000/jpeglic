import logging
from threading import RLock
import configparser
from pathlib import Path
import sys
from typing import Any

# _internal
# Create new one instead of using constants.py to avoid circular imports.
PROGRAM_DIR = Path(sys._MEIPASS) if getattr(sys, "frozen", False) else Path(__file__).resolve().parent.parent

class ConfigManager:
    _instance = None
    _lock = RLock()
    _config_location = PROGRAM_DIR / "config.ini"
    _config = configparser.ConfigParser()

    def __new__(cls):
        with cls._lock:
            if not cls._instance:
                cls._instance = super().__new__(cls)
                cls._instance._initialize()
        return cls._instance

    @classmethod
    def _initialize(cls) -> None:
        """Reads config file if exists."""
        with cls._lock:
            if cls._config_location.is_file():
                try:
                    cls._config.read(cls._config_location, encoding="utf-8")
                except Exception as e:
                    logging.error(f"[ConfigManager] {e}")
    
    @classmethod
    def get(cls, section: str, option: str, fallback=None) -> Any:
        """Returns value or fallback if not found."""
        with cls._lock:
            try:
                return cls._config.get(section, option, fallback=fallback)
            except configparser.Error as e:
                logging.error(f"[ConfigManager] {e}")
                return fallback

    @classmethod
    def reload(cls) -> None:
        """Wipes the current config variables and re-reads the config file."""
        with cls._lock:
            cls._config.clear()
            cls._initialize()
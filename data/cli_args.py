import sys
from pathlib import Path
import argparse
from dataclasses import dataclass

from PySide6.QtCore import QMimeData, QUrl, QPointF, Qt
from PySide6.QtGui import QDropEvent

@dataclass
class CliArgs:
    resources: list[str]

def parseArgs() -> CliArgs:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "resources",
        nargs="*",
        help="Paths to local resources (files or directories) to add."
    )
    args = parser.parse_args()

    # Resources
    resources = []
    for res in args.resources:
        path = Path(res)
        if path.is_dir() or path.is_file():
            resources.append(path)

    return CliArgs(
        resources=resources
    )

def getArgsLocalResQDropEvent() -> QDropEvent | None:
    """
    Returns a QDropEvent with mimeData containing URLs to local resources, or None. Requires QApplication to exist!

    This function extracts local resources passed via command-line arguments and wraps them in a QDropEvent.
    """
    if len(sys.argv) < 2:   # Avoid parsing when no additonal arguments are passed.
        return None
    
    cli_args = parseArgs()
    if cli_args.resources == []:
        return None

    # Prepare mimeData
    urls = [QUrl.fromLocalFile(res) for res in cli_args.resources]
    mime_data = QMimeData()
    mime_data.setUrls(urls)

    # Wrap in QDropEvent
    drop_event = QDropEvent(
        QPointF(0.0, 0.0),
        Qt.CopyAction,
        mime_data,
        Qt.LeftButton,
        Qt.NoModifier,
    )
    drop_event._mime_data = mime_data   # Prevents mime_data from being garbage collected. Will cause seg fault without it.
    
    return drop_event
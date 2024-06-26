import subprocess
import os
import logging

def _getStartupInfo():
    """Get startup info for Windows. Prevents console window from showing."""
    startupinfo = None
    if os.name == 'nt':
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = subprocess.SW_HIDE
    return startupinfo

def runProcess(*cmd, cwd=None):
    """Run process."""
    logging.info(f"Running command: {cmd}")

    process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=_getStartupInfo(), cwd=cwd)
    
    try:
        if process.stdout:
            logging.debug(process.stdout.decode())
        if process.stderr:
            logging.debug(process.stderr.decode())
    except Exception as err:
        logging.error(f"Failed to decode process output. {err}")

def runProcessOutput(*cmd) -> (str, str):
    """Run process then return its output.
    
    Output: (stdout, stderr)
    """
    logging.info(f"Running command with output: {cmd}")

    process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=_getStartupInfo())

    try:
        stdout, stderr = "", ""
        if process.stdout:
            stdout = process.stdout.decode("utf-8")
            logging.debug(stdout)
        if process.stderr:
            stderr = process.stderr.decode("utf-8")
            logging.debug(stderr)
    except Exception as err:
        logging.error(f"Failed to decode process output. {err}")

    return (stdout, stderr)
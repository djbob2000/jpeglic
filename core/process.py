import subprocess
import os
import logging

from data.process_manager import ProcessManager

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
    logging.info(f"[runProcess] {cmd}")

    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=_getStartupInfo(), cwd=cwd)
    ProcessManager.addProcess(process)
    process.wait()
    stdout, stderr = process.communicate()

    try:
        if stdout:
            logging.info(f"[runProcess] {stdout.decode('utf-8')}")
        if stderr:
            logging.info(f"[runProcess] {stderr.decode('utf-8')}")
    except Exception as err:
        logging.error(f"[runProcess] Failed to decode process output. {err}")

def runProcessOutput(*cmd, cwd=None) -> (str, str):
    """Run process then return its output.
    
    Output: (stdout, stderr)
    """
    logging.info(f"[runProcessOutput] {cmd}")

    process = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=_getStartupInfo(), cwd=cwd)

    try:
        stdout, stderr = "", ""
        if process.stdout:
            stdout = process.stdout.decode("utf-8")
            logging.info(f"[runProcessOutput] {stdout}")
        if process.stderr:
            stderr = process.stderr.decode("utf-8")
            logging.info(f"[runProcessOutput] {stderr}")
    except Exception as err:
        logging.error(f"Failed to decode process output. {err}")

    return (stdout, stderr)
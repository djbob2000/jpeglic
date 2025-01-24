import threading
import subprocess

class ProcessManager:
    processes = []
    lock = threading.Lock()

    @classmethod
    def addProcess(cls, process: subprocess.Popen) -> None:
        if not isinstance(process, subprocess.Popen):
            raise TypeError("Process must be a subprocess.Popen object")
        with cls.lock:
            cls.processes.append(process)
    
    @classmethod
    def removeProcess(cls, process: subprocess.Popen) -> None:
        if not isinstance(process, subprocess.Popen):
            raise TypeError("Process must be a subprocess.Popen object")
        with cls.lock:
            try:
                cls.processes.remove(process)
            except ValueError:
                pass

    @classmethod
    def terminateAll(cls) -> None:
        with cls.lock:
            processes_to_terminate = cls.processes.copy()
            cls.processes.clear()
        
        for process in processes_to_terminate:
            process.terminate()
        
        for process in processes_to_terminate:
            process.wait()
    
    @classmethod
    def clear(cls) -> None:
        with cls.lock:
            cls.processes.clear()
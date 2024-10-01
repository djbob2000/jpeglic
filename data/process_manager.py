import threading
import subprocess

class ProcessManager:
    processes = []
    lock = threading.Lock()

    @classmethod
    def addProcess(cls, process):
        if not isinstance(process, subprocess.Popen):
            raise TypeError("Process must be a subprocess.Popen object")
        with cls.lock:
            cls.processes.append(process)
    
    @classmethod
    def terminateAll(cls):
        with cls.lock:
            processes_to_terminate = cls.processes.copy()
            cls.processes.clear()
        
        for process in processes_to_terminate:
            process.terminate()
        
        for process in processes_to_terminate:
            process.wait()
    
    @classmethod
    def clear(cls):
        with cls.lock:
            cls.processes.clear()
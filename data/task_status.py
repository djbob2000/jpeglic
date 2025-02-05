from threading import Lock
from functools import wraps

_lock = Lock()

class Status:
    canceled = False

def synchronized(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        with _lock:
            return func(*args, **kwargs)
    return wrapper

@synchronized
def wasCanceled():
    return Status.canceled

@synchronized
def cancel():
    Status.canceled = True

@synchronized
def reset():
    Status.canceled = False
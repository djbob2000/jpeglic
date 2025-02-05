import threading

cancel_event = threading.Event()

def wasCanceled() -> bool:
    return cancel_event.is_set()

def cancel() -> None:
    cancel_event.set()

def reset() -> None:
    cancel_event.clear()
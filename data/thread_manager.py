import logging

from PySide6.QtCore import QThreadPool

from core.ram_optimizer import RAMOptimizer

class ThreadManager:
    def __init__(self, threadpool: QThreadPool) -> None:
        self.threadpool = threadpool
    
        self.threads_per_worker = 1
        self.burst_threadpool = []
    
    def configure(self,
        item_count: int,
        used_thread_count: int,
        ram_optimizer_mode: str,
        ram_optimizer_rules: str,
        dst_file_format: str,
        avif_encoder: str,
        jpeg_xl_effort: int,
        jpeg_xl_lossy_modular: bool,
        jpeg_xl_lossless: bool,
        jpeg_xl_intelligent_effort: bool,
    ) -> None:

        # Setup RAM optimimzer
        if RAMOptimizer().isNecessary(
            dst_file_format, avif_encoder, jpeg_xl_effort, jpeg_xl_lossy_modular, jpeg_xl_lossless, jpeg_xl_intelligent_effort
        ):
            match ram_optimizer_mode:
                case "Static":
                    single_worker_mode = True
                    RAMOptimizer().setEnabled(False)
                case "Dynamic":
                    single_worker_mode = True   # RAM Optimizer can assign more in the worker.
                    RAMOptimizer().setEnabled(True)
                    RAMOptimizer.setUsedThreadCount(used_thread_count)
                    RAMOptimizer().setOptimizationRulesStr(ram_optimizer_rules)
                case "Disabled":
                    single_worker_mode = False
                    RAMOptimizer().setEnabled(False)
                case _:
                    logging.error(f"[ThreadManager - configure] Unrecognized ram_optimizer_mode ({ram_optimizer_mode})")
            
        else:
            single_worker_mode = False
        
        # Setup thread count
        if single_worker_mode:
            self.burst_threadpool = []
            self.threads_per_worker = used_thread_count
            self.threadpool.setMaxThreadCount(1)
        else:
            self.burst_threadpool = self._getBurstThreadPool(
                item_count,
                used_thread_count,
            )
            self.threadpool.setMaxThreadCount(used_thread_count)

    def getAvailableThreads(self, index: int) -> int:
        if self.burst_threadpool:
            try:
                available_threads = self.burst_threadpool[index]
            except IndexError:
                logging.error("[ThreadManager] getAvailableThreads - IndexError")
                available_threads = self.threads_per_worker
        else:
            available_threads = self.threads_per_worker
        
        return available_threads

    def _getBurstThreadPool(self, workers: int, cores: int) -> list:
        """
        Distributes cores among workers to fully utilize the available cores.

        Args:
            workers - worker count
            cores - available core count
        
        Returns (examples):
            (3, 6) -> [2,2,2]
            (3, 5) -> [2,2,1]
            (2, 5) -> [3,2]
            (5, 5) -> []
            (6, 5) -> []

            If workers >= cores outputs an empty list 
        """
        if workers >= cores or cores <= 0 or workers <= 0:
            return []
        
        base_threads = cores // workers
        extra_threads = cores % workers
        thread_pool = [base_threads for _ in range(workers)]
        
        for i in range(extra_threads):
            thread_pool[i] += 1
        
        return thread_pool
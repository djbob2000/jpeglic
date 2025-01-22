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

        single_worker_mode = False
        RAMOptimizer().setEnabled(False)

        # Setup RAM optimimzer
        if RAMOptimizer.isNecessary(
            dst_file_format,
            avif_encoder,
            jpeg_xl_effort,
            jpeg_xl_lossy_modular,
            jpeg_xl_lossless,
            jpeg_xl_intelligent_effort
        ):
            match ram_optimizer_mode:
                case "Static":
                    single_worker_mode = True
                case "Dynamic":
                    RAMOptimizer.setOptimizationRulesStr(ram_optimizer_rules)
                    if RAMOptimizer.applicableRuleExists(dst_file_format, avif_encoder):
                        single_worker_mode = True   # Cold start to avoid a RAM spike. RAM Optimizer can assign more in the worker.
                        RAMOptimizer.setEnabled(True)
                        RAMOptimizer.setUsedThreadCount(used_thread_count)
                case "Disabled":
                    pass
                case _:
                    logging.error(f"[ThreadManager - configure] Unrecognized ram_optimizer_mode ({ram_optimizer_mode})")
        
        # Setup workers
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
        if self.burst_threadpool and index < len(self.burst_threadpool):
            return self.burst_threadpool[index]
        
        return self.threads_per_worker

    @staticmethod
    def _getBurstThreadPool(workers: int, cores: int) -> list:
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
        if workers >= cores or min(cores, workers) < 1:
            return []
        
        base_threads = cores // workers
        extra_threads = cores % workers
        thread_pool = [base_threads for _ in range(workers)]
        
        for i in range(extra_threads):
            thread_pool[i] += 1
        
        return thread_pool
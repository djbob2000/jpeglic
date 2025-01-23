import logging
from unittest.mock import patch, MagicMock
from contextlib import ExitStack

import pytest
from PySide6.QtCore import QThreadPool

import core.ram_optimizer as ram_optimizer
from core.ram_optimizer import RAMOptimizer

@pytest.fixture(autouse=True)
def reset_singleton():
    RAMOptimizer._instance = None
    RAMOptimizer.enabled = False
    RAMOptimizer.used_thread_count = None
    RAMOptimizer.rules = []
    QThreadPool.globalInstance = MagicMock(return_value=MagicMock(spec=QThreadPool))
    RAMOptimizer()  # Init

def test_singleton_instance():
    assert RAMOptimizer() == RAMOptimizer()

@pytest.fixture
def run_patches():
    mocks = {
        "setEnabled": patch("core.ram_optimizer.RAMOptimizer.setEnabled"),
        "_getMaxWorkerCount": patch("core.ram_optimizer.RAMOptimizer._getMaxWorkerCount", return_value=4),
        "convert.getImageResMp": patch("core.ram_optimizer.convert.getImageResMp", return_value=10.0),
    }

    with ExitStack() as stack:
        _mocks = {name: stack.enter_context(patcher) for name, patcher in mocks.items()}
        yield _mocks

@pytest.mark.parametrize("check", [
    "disabled", "used_thread_count_none", "empty_rules"
])
def test_run_checks(check, run_patches, caplog):
    mocks = run_patches
    caplog.set_level(logging.INFO)
    RAMOptimizer.enabled = False if check == "disabled" else True
    RAMOptimizer.used_thread_count = None if check == "used_thread_count_none" else 4
    RAMOptimizer.rules = [] if check == "empty_rules" else ["stub"]
    org_threads_per_worker = 4
    
    assert RAMOptimizer.run(
        thread_count_per_worker=org_threads_per_worker,
        src_image_path="/tmp/image.jpg",
        dst_file_format="JPEG XL",
        avif_encoder="",
        jpeg_xl_effort=7,
        jpeg_xl_lossy_modular=False,
        jpeg_xl_lossless=False,
        jpeg_xl_intelligent_effort=False,
    ) == org_threads_per_worker
    
    RAMOptimizer.threadpool.assert_not_called()
    if check in {"used_thread_count_none", "empty_rules"}:
        mocks["setEnabled"].assert_called_once_with(False)
    else:
        mocks["setEnabled"].assert_not_called()

    mocks["convert.getImageResMp"].assert_not_called()

def test_run_happy_path(run_patches, caplog):
    mocks = run_patches
    caplog.set_level(logging.INFO)

    dst_file_format = "JPEG XL"
    src_image_path = "/tmp/image.jpg"
    avif_encoder = "encoder"
    org_threads_per_worker = 16
    used_thread_count = 16
    optimized_thread_count = 8
    image_res = 10.0
    
    RAMOptimizer.enabled = True
    RAMOptimizer.used_thread_count = used_thread_count
    RAMOptimizer.rules = ["stub"]
    mocks["_getMaxWorkerCount"].return_value = optimized_thread_count
    mocks["convert.getImageResMp"].return_value = image_res

    assert RAMOptimizer.run(
        thread_count_per_worker=org_threads_per_worker,
        src_image_path=src_image_path,
        dst_file_format=dst_file_format,
        avif_encoder=avif_encoder,
        jpeg_xl_effort=7,
        jpeg_xl_lossy_modular=False,
        jpeg_xl_lossless=False,
        jpeg_xl_intelligent_effort=False,
    ) == used_thread_count // optimized_thread_count

    mocks["setEnabled"].assert_not_called()
    mocks["convert.getImageResMp"].assert_called_once_with(src_image_path)
    mocks["_getMaxWorkerCount"].assert_called_once_with(image_res, dst_file_format, avif_encoder)
    RAMOptimizer.threadpool.setMaxThreadCount.assert_called_once_with(optimized_thread_count)
    assert "Max concurrent workers" in caplog.records[0].message

def test_run_invalid_res(run_patches):
    mocks = run_patches

    used_thread_count = 16
    
    RAMOptimizer.enabled = True
    RAMOptimizer.used_thread_count = used_thread_count
    RAMOptimizer.rules = ["stub"]
    mocks["convert.getImageResMp"].return_value = -1.0

    assert RAMOptimizer.run(
        thread_count_per_worker=4,
        src_image_path="/tmp/image.jpg",
        dst_file_format="JPEG XL",
        avif_encoder="",
        jpeg_xl_effort=7,
        jpeg_xl_lossy_modular=False,
        jpeg_xl_lossless=False,
        jpeg_xl_intelligent_effort=False,
    ) == 1

    mocks["convert.getImageResMp"].assert_called_once()
    mocks["_getMaxWorkerCount"].assert_not_called()
    RAMOptimizer.threadpool.setMaxThreadCount.assert_called_once_with(used_thread_count)

@pytest.mark.parametrize("high_ram_usage", [
    True, False
])
def test_isNecessary_jpeg_xl(high_ram_usage):
    jpeg_xl_args = [7, False, False, False]
    with patch("core.ram_optimizer.jpegXlHighRamUsage", return_value=high_ram_usage) as mock_jpegXlHighRamUsage:
        assert RAMOptimizer.isNecessary("JPEG XL", "", *jpeg_xl_args) == high_ram_usage
        mock_jpegXlHighRamUsage.assert_called_once_with(*jpeg_xl_args)

@pytest.mark.parametrize("dst_file_format, encoder, expected", [
    ("AVIF", "AOM AV1", False),
    ("AVIF", "SVT-AV1-PSY", True),
    ("AVIF", "", False),
])
def test_isNecessary_avif(dst_file_format, encoder, expected):
    assert RAMOptimizer.isNecessary(
        dst_file_format, encoder, 7, False, False, False
    ) == expected

@pytest.mark.parametrize("dst_file_format", [
    "JPEG",
    "WebP",
    "PNG",
])
def test_isNecessary_other(dst_file_format):
    assert RAMOptimizer.isNecessary(dst_file_format, "", 7, False, False, False) == False

@pytest.mark.parametrize("effort, jxl_modular, lossless, intelligent_effort, expected", [
    # VarDCT
    (0, False, False, False, False),    # Low RAM
    (7, False, False, False, False),
    (8, False, False, False, True),     # High RAM
    (9, False, False, False, True),
    (10, False, False, False, True),
    (7, False, False, True, True),      # Int. effort
    (9, False, False, True, True),

    # Lossy Modular
    (7, True, False, False, True),
    (9, True, False, False, True),
    (10, True, False, False, True),
    (7, True, False, True, True),

    # Lossless
    (7, False, True, False, False),     # Low RAM
    (9, False, True, False, False),
    (10, False, True, False, True),     # High RAM
    (7, False, True, True, False),      # Int. effort
    (9, False, True, True, False),
])
def test_jpegXlHighRamUsage(effort, jxl_modular, lossless, intelligent_effort, expected):
    assert ram_optimizer.jpegXlHighRamUsage(
        effort, jxl_modular, lossless, intelligent_effort
    ) == expected
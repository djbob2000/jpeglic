from unittest.mock import MagicMock, patch
from contextlib import ExitStack

import pytest
from PySide6.QtCore import QMutex

from core.proxy import Proxy
from core.exceptions import FileException

@pytest.fixture
def proxy():
    return Proxy()

def test_isProxyNeeded_png(proxy):
    assert proxy.isProxyNeeded("PNG", "png") == False

@pytest.mark.parametrize("file_format,src_ext,expected", [
    ("JPEG XL", "png", False),
    ("JPEG XL", "avif", True),
    ("AVIF", "png", False),
    ("AVIF", "jxl", True),
    ("WebP", "png", False),
    ("WebP", "exr", True),
    ("Smallest Lossless", "png", True),
])
def test_test_isProxyNeeded_base(proxy, file_format, src_ext, expected):
    assert proxy.isProxyNeeded(file_format, src_ext) == expected

def test_test_isProxyNeeded_jpegli(proxy):
    assert not proxy.isProxyNeeded("JPEG", "jpg", jpegli=True)

def test_test_isProxyNeeded_unknown(proxy):
    assert proxy.isProxyNeeded("JPEG XL", "exr")

def test_isProxyNeeded_downscaling(proxy):
    assert proxy.isProxyNeeded("JPEG XL", "exr", downscaling_enabled=True)
    assert not proxy.isProxyNeeded("JPEG XL", "png", downscaling_enabled=True)

@pytest.fixture
def proxy_generate_patched(proxy):
    patches = {
        "isfile": patch("core.proxy.os.path.isfile", return_value=True),
        "runBinary": patch("core.proxy.runBinary", return_value=("", "")),
        "getUniqueTmpFilePath": patch("core.proxy.getUniqueTmpFilePath", return_value="/proxy/dst/proxy.png"),
        "getDecoder": patch("core.proxy.getDecoder"),
    }

    with ExitStack() as stack:
        mocks = {name: stack.enter_context(patcher) for name, patcher in patches.items()}
        yield proxy, mocks

def test_generate_proxy_success(proxy_generate_patched):
    proxy, mocks = proxy_generate_patched
    src, src_ext, dst_dir, file_name = "/path/to/src.avif", "avif", "/proxy/dst", "src"
    proxy_path = "/proxy/dst/proxy.png"
    mocks["getUniqueTmpFilePath"].return_value = proxy_path

    proxy.generate(src, src_ext, dst_dir, file_name, 0, QMutex())

    assert proxy.proxy_path == proxy_path
    mocks["runBinary"].assert_called_once_with(
        mocks["getDecoder"].return_value,
        [],
        src,
        proxy_path,
    )
    mocks["isfile"].assert_called_once_with(proxy_path)

def test_generate_proxy_failure(proxy_generate_patched):
    proxy, mocks = proxy_generate_patched
    stderr = "stderr"
    mocks["isfile"].return_value = False
    mocks["runBinary"].return_value = ("", stderr)

    with pytest.raises(FileException) as excinfo:
        proxy.generate("/path/to/src.avif", "avif", "/proxy/dst", "src", 0, QMutex())
        
    assert excinfo.value.id == "Proxy1"
    assert "Generating proxy failed." in excinfo.value.msg
    assert stderr in excinfo.value.msg

def test_getPath_empty(proxy):
    assert not proxy.proxyExists()

def test_getPath(proxy):
    proxy.proxy_path = "/proxy/path/proxy.png"
    assert proxy.getPath() == "/proxy/path/proxy.png"

def test_proxyExists_empty(proxy):
    assert not proxy.proxyExists()

def test_proxyExists(proxy):
    proxy.proxy_path = "/proxy/path/proxy.png"
    assert proxy.proxyExists()

def test_cleanup(proxy):
    proxy.proxy_path = "/proxy/path/proxy.png"
    with patch("core.proxy.os.remove") as mock_remove:
        proxy.cleanup()
        mock_remove.assert_called_once_with("/proxy/path/proxy.png")
        assert proxy.proxy_path is None
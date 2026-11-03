"""
Shared pytest fixtures.
"""
import os
import pytest

os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("PYTHONIOENCODING", "utf-8")


@pytest.fixture(autouse=True)
def _reset_caches(monkeypatch):
    """Clear LRU-cached settings + weather cache before every test."""
    import app.core.config as _cfg
    import app.services.weather.client as _wc
    from app.services.weather.cache import TTLCache

    monkeypatch.setenv("GROQ_API_KEY", "")
    _cfg.get_settings.cache_clear()
    _wc._cache = TTLCache(ttl_seconds=5)

    yield

    _cfg.get_settings.cache_clear()
    _wc._cache = None

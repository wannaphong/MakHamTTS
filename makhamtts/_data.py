"""Locate runtime data in both layouts: installed wheel (makhamtts/data,
via the force-include in pyproject.toml) and repo checkout (../data).

Based on FastThaiG2P (Copyright (c) 2026 Charin Polpanumas, Apache-2.0 license).
"""

from pathlib import Path

_PKG = Path(__file__).parent


def data_path(*parts: str) -> Path:
    installed = _PKG / "data" / Path(*parts)
    if installed.exists():
        return installed
    return _PKG.parent / "data" / Path(*parts)

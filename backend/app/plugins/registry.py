from __future__ import annotations

import importlib
import pkgutil
from typing import Any, Union

from app.plugins.base import (
    AIProviderPlugin,
    DataSourcePlugin,
    FileParserPlugin,
    NotificationPlugin,
)

PluginBase = Union[FileParserPlugin, DataSourcePlugin, AIProviderPlugin, NotificationPlugin]

_registry: dict[str, dict[str, PluginBase]] = {
    "parser": {},
    "datasource": {},
    "ai": {},
    "notification": {},
}


def register(plugin_type: str, plugin: PluginBase) -> None:
    if plugin_type not in _registry:
        raise ValueError(f"Unknown plugin type: {plugin_type}")
    _registry[plugin_type][plugin.name] = plugin


def get(plugin_type: str, name: str) -> PluginBase | None:
    return _registry.get(plugin_type, {}).get(name)


def get_all(plugin_type: str) -> dict[str, PluginBase]:
    return _registry.get(plugin_type, {})


def discover() -> None:
    """Auto-discover and register plugins from app.plugins subpackages."""
    import app.plugins.parsers as parsers_pkg

    for _importer, modname, _ispkg in pkgutil.iter_modules(parsers_pkg.__path__):
        module = importlib.import_module(f"app.plugins.parsers.{modname}")
        if hasattr(module, "register_plugin"):
            module.register_plugin()

    import app.plugins.ai_providers as ai_pkg

    for _importer, modname, _ispkg in pkgutil.iter_modules(ai_pkg.__path__):
        module = importlib.import_module(f"app.plugins.ai_providers.{modname}")
        if hasattr(module, "register_plugin"):
            module.register_plugin()

"""Build the Sell4me blueprint and its documentation.

    python blueprint/build.py   ->   sell4me.blueprint.json  and  BLUEPRINT.md

The blueprint is a Pawabase ``pawabase.blueprint`` document: create a project from it
(``POST /platform/v1/projects`` with ``blueprint``) and every resource, route, bucket, schedule, hook and role exists. The
functions themselves are code (``code/sell4me``, with the shared package ``kit/sell4me_kit``) and are loaded from the API's
code path.
"""

from __future__ import annotations

import importlib
import json
import pkgutil
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path[:0] = [str(ROOT / "kit"), str(ROOT.parent.parent), str(ROOT / "code"), str(HERE)]

import spec  # noqa: E402
from sell4me_kit.endpoints import REGISTRY  # noqa: E402

REPORT: dict[str, Any] = {}

#: Money a client may send as a number (``5000``) or a decimal string (``"50.00"``): the original read form fields, which are always strings, so a plain
#: ``string`` type here would reject the JSON number every API client sends first.
MONEY_FIELDS = {"price", "compare_at", "cost", "minimum_order", "maximum_discount", "budget", "spend", "value"}


def _field(item: Any, f: dict[str, Any]) -> dict[str, Any]:
    out = dict(f)
    if out["name"] in MONEY_FIELDS:
        out["type"] = "json"
    if item.method == "PATCH":  # a PATCH is a partial update: required-to-create must not mean required-to-change-one-field
        out.pop("required", None)
    return out


def load_functions() -> list[str]:
    package = importlib.import_module("sell4me.functions") if (ROOT / "code" / "sell4me" / "functions" / "__init__.py").exists() else None
    names = []
    base = ROOT / "code" / "sell4me" / "functions"
    for info in sorted(pkgutil.iter_modules([str(base)]), key=lambda i: i.name):
        if info.name.startswith("_"):
            continue
        spec_ = importlib.util.spec_from_file_location(f"sell4me_functions_{info.name}", base / f"{info.name}.py")
        module = importlib.util.module_from_spec(spec_)
        sys.modules[spec_.name] = module
        spec_.loader.exec_module(module)
        names.append(info.name)
    del package
    return names


def route_definitions() -> list[dict[str, Any]]:
    routes = []
    for item in sorted(REGISTRY.values(), key=lambda e: (e.area, e.path, e.method)):
        route = {
            "method": item.method, "path": item.path, "name": item.name, "description": item.summary, "policy": item.policy,
            "handler_type": "function", "handler": item.name, "tags": [item.area], "enabled": True,
        }
        if item.input_fields:
            route["input_fields"] = [_field(item, f) for f in item.input_fields]
        if item.rate_limit:
            route["rate_limit"] = item.rate_limit
        routes.append(route)
    return routes


def build() -> dict[str, Any]:
    load_functions()
    resources = json.loads((HERE / "resources.json").read_text()) + json.loads((HERE / "resources_extra.json").read_text())
    definitions = {
        "resources": resources,
        "routes": route_definitions(),
        "buckets": spec.BUCKETS,
        "schedules": spec.SCHEDULES,
        "inbound-hooks": spec.INBOUND_HOOKS,
        "subscriptions": spec.SUBSCRIPTIONS,
    }
    return {
        "format": "pawabase.blueprint", "version": 1, "name": spec.PROJECT_NAME, "description": spec.PROJECT_DESCRIPTION,
        "source": {"generator": "examples/sell4me/blueprint/build.py"},
        "definitions": definitions, "roles": spec.ROLES, "auth": spec.AUTH, "settings": spec.SETTINGS, "data": {},
    }


if __name__ == "__main__":
    import docs

    document = build()
    out = ROOT / "sell4me.blueprint.json"
    out.write_text(json.dumps(document, indent=1, ensure_ascii=False) + "\n")
    (ROOT / "BLUEPRINT.md").write_text(docs.render(document, REPORT) + "\n")
    print(f"{out.name}: {len(document['definitions']['resources'])} resources, {len(document['definitions']['routes'])} routes, "
          f"{len(document['definitions']['schedules'])} schedules, {len(document['definitions']['buckets'])} buckets")

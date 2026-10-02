"""Derive the Pawabase resources from Sell4me's 53 Tortoise models.

    python tools/gen_resources.py   ->  blueprint/resources.json

`tools/source-models.json` is a dump of the original models (table, fields, types,
defaults, uniqueness). The mapping is mechanical; what is deliberate is listed here:

* Every foreign key becomes an integer ``<name>_id`` column. Pawabase has no
  referential integrity, so the code (and the order of writes) keeps it.
* A foreign key to ``User`` becomes a string user id: users live in Akountz.
* ``User`` itself is not a resource: identity is Akountz's, and what Sell4me kept on
  the user (name, avatar, timezone, last store, onboarding answers) is ``profiles``.
* Timestamps are Pawabase's own (``created_at``/``updated_at``); ``deleted_at`` stays,
  because every Sell4me model soft-deletes.
* No resource exposes a REST operation. Merchants and shoppers reach data only through
  functions, which check the store, the member and the permission first.
"""

from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = json.loads((HERE / "source-models.json").read_text())

SKIP = {"User"}

#: Columns the port adds to a model, with why.
ADD = {
    # The unguessable name of the staff inbox's realtime channel (see services/helpdesk.py).
    "stores": [{"name": "help_secret", "type": "string", "max_length": 64}],
}
IMPLICIT = {"id", "created_at", "updated_at"}

TYPE = {
    "IntField": "integer",
    "BigIntField": "integer",
    "CharField": "string",
    "TextField": "text",
    "JSONField": "json",
    "BooleanField": "boolean",
    "DatetimeField": "datetime",
    "SoftDeleteField": "datetime",
    "DateField": "date",
    "PasswordField": "string",
}


def field(name: str, info: dict, models: dict) -> dict | None:
    kind = info["type"]
    out: dict = {}
    if kind == "ForeignKeyFieldInstance":
        target = info.get("fk", "").split(".")[-1]
        name = info.get("source_field") or f"{name}_id"
        out = {"name": name, "type": "string" if target == "User" else "integer", "indexed": True}
        if target == "User":
            out["max_length"] = 64
    elif kind in TYPE:
        out = {"name": name, "type": TYPE[kind]}
        if kind == "CharField" and info.get("max_length"):
            out["max_length"] = info["max_length"]
        if kind == "PasswordField":
            out["max_length"] = 255
    else:
        return None
    if not info.get("null") and name != "deleted_at":
        out["required"] = False  # the code supplies every required value; the table is permissive
    if info.get("unique"):
        out["unique"] = True
    elif info.get("index"):
        out["indexed"] = True
    if "default" in info and out["type"] in ("integer", "string", "boolean", "text"):
        out["default"] = info["default"]
    return out


def main() -> None:
    resources = []
    uniques: dict[str, list[list[str]]] = {}
    for model, meta in SOURCE.items():
        if model in SKIP:
            continue
        fields = []
        for name, info in meta["fields"].items():
            if name in IMPLICIT:
                continue
            converted = field(name, info, SOURCE)
            if converted is not None:
                fields.append(converted)
        fields.extend(ADD.get(meta["table"], []))
        resources.append(
            {
                "name": meta["table"],
                "description": f"Sell4me {model} ({meta['module']}).",
                "fields": fields,
                "operations": {},
                "events": False,
                "tags": [meta["module"]],
            }
        )
        keyed = []
        for group in meta["unique_together"]:
            keyed.append([f"{name}_id" if meta["fields"][name]["type"] == "ForeignKeyFieldInstance" else name for name in group])
        if keyed:
            uniques[meta["table"]] = keyed
    resources.sort(key=lambda r: r["name"])
    (HERE.parent / "blueprint" / "resources.json").write_text(json.dumps(resources, indent=1) + "\n")
    (HERE.parent / "blueprint" / "unique_together.json").write_text(json.dumps(uniques, indent=1) + "\n")
    print(len(resources), "resources,", sum(len(v) for v in uniques.values()), "composite unique keys")


main()

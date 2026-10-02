"""Email templates: Jinja files in ``assets/mail/<name>/`` (subject, html, text).

They are the **shipped defaults**. ``blueprint/build.py`` publishes them as the project's mail templates, and from then on the Pawabase dashboard (Studio, Mail
templates) is where they are edited: the flows that send mail name a template and hand it the event's data, and the platform renders what is stored there. The
same files render here for the merchant's preview screen, so what a merchant previews is what the project ships.

Tables and inline styles, not flexbox or a style sheet: Outlook lays HTML out with Word's engine, which supports neither. The plain-text part is not an afterthought:
it is what a screen reader, a smartwatch and every spam filter that penalises HTML-only mail actually read.

The data each template reads is the view ``event_views.py`` builds for the event that sends it (``store``, ``order``, ``items``, ``address``, ``refund``,
``invitation``, ``owner``, ``cart``) plus ``app_name``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from jinja2.sandbox import SandboxedEnvironment

ASSETS = Path(__file__).parent / "assets" / "mail"
_jinja = SandboxedEnvironment(autoescape=True)

__all__ = ["TEMPLATES", "render", "source"]


def source(name: str) -> dict[str, str]:
    """The three files of one template: ``subject``, ``html`` and ``text``."""
    folder = ASSETS / name
    return {"subject": (folder / "subject.txt").read_text().strip(), "html": (folder / "html.j2").read_text(), "text": (folder / "text.j2").read_text()}


TEMPLATES = sorted(path.name for path in ASSETS.iterdir() if path.is_dir()) if ASSETS.is_dir() else []


def render(template: str, context: dict[str, Any], settings: Any = None) -> tuple[str, str, str]:
    """One template as ``(html, text, subject)``. An unknown name raises, rather than sending a blank email."""
    if template not in TEMPLATES:
        raise KeyError(f"No mail template {template!r}. Known: {', '.join(TEMPLATES)}.")
    parts = source(template)
    data = {"app_name": getattr(settings, "app_name", "Sell4me"), **context}
    return (_jinja.from_string(parts["html"]).render(**data), _jinja.from_string(parts["text"]).render(**data), _jinja.from_string(parts["subject"]).render(**data))

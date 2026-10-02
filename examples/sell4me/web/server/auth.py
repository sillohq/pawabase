"""Sign-in, sign-up, password reset and onboarding: Akountz does the identity; this only carries the session."""

from __future__ import annotations

from typing import Any

from sillo.core.http import HttpContext
from sillo.core.routing import Route
from sillo_inertia import render, set_errors, set_flash

from . import common
from .dashboard import STORE, explain
from .gateway import ApiFailure

MIN_PASSWORD = 10


async def guest_only(ctx: HttpContext) -> Any | None:
    """Someone already signed in has no business on the login page."""
    return common.to(ctx, "/") if common.api_of(ctx).signed_in else None


async def login_page(ctx: HttpContext) -> Any:
    return await guest_only(ctx) or await render("auth/Login", {})


async def login(ctx: HttpContext) -> Any:
    body = await common.body_of(ctx)
    api = common.api_of(ctx)
    try:
        session = await common.client().as_user(None).sign_in(str(body.get("email") or "").strip(), str(body.get("password") or ""))
    except Exception as error:  # noqa: BLE001 - a wrong password and a missing account must look the same
        failure = ApiFailure.of(error) if hasattr(error, "status_code") else None
        if failure is not None and failure.status in (400, 401, 403, 422):
            set_errors(ctx, {"email": "Those details don't match an account."})
            return common.to(ctx, "/login")
        raise
    if session.get("mfa_required"):
        set_errors(ctx, {"email": "This account uses two-factor sign-in, which this screen does not support yet."})
        return common.to(ctx, "/login")
    api.remember(session)
    return common.to(ctx, "/")


async def register_page(ctx: HttpContext) -> Any:
    return await guest_only(ctx) or await render("auth/Register", {})


async def register(ctx: HttpContext) -> Any:
    body = await common.body_of(ctx)
    email, password = str(body.get("email") or "").strip(), str(body.get("password") or "")
    problems: dict[str, str] = {}
    if "@" not in email:
        problems["email"] = "Enter a valid email address."
    if len(password) < MIN_PASSWORD:
        problems["password"] = f"Use at least {MIN_PASSWORD} characters."
    if problems:
        set_errors(ctx, problems)
        return common.to(ctx, "/register")
    survey = {k: body.get(k) for k in ("heard_from", "signup_goal") if body.get(k)}
    try:
        session = await common.client().as_user(None).sign_up(email, password, name=str(body.get("name") or "").strip() or None, data={"full_name": body.get("name"), **survey})
    except Exception as error:  # noqa: BLE001
        failure = ApiFailure.of(error) if hasattr(error, "status_code") else None
        if failure is None:
            raise
        set_errors(ctx, failure.fields or {"email": failure.message})
        return common.to(ctx, "/register")
    api = common.api_of(ctx)
    if not session.get("access_token"):  # the project asks for a confirmed email first
        set_flash(ctx, "success", "Check your email to confirm your address, then sign in.")
        return common.to(ctx, "/login")
    api.remember(session)
    if survey or body.get("name"):
        try:
            await api.call("PATCH", "/account/profile", json={"full_name": body.get("name"), **survey})
        except ApiFailure:
            pass  # the survey is a courtesy; the account exists
    return common.to(ctx, "/onboarding")


async def logout(ctx: HttpContext) -> Any:
    api = common.api_of(ctx)
    if api.signed_in:
        try:
            await api.call("POST", "/auth/v1/logout")
        except ApiFailure:
            pass  # an already-expired token is already signed out
    api.sign_out()
    return common.to(ctx, "/login")


async def forgot_page(ctx: HttpContext) -> Any:
    return await render("auth/ForgotPassword", {})


async def forgot(ctx: HttpContext) -> Any:
    body = await common.body_of(ctx)
    try:
        await common.client().as_user(None).request_password_reset(str(body.get("email") or "").strip(), redirect_to=f"{common.settings().origin}/reset-password/{{token}}")
    except Exception:  # noqa: BLE001 - always the same answer: the form must not reveal which addresses have accounts
        pass
    set_flash(ctx, "success", "If that address has an account, a reset link is on its way.")
    return common.to(ctx, "/forgot-password")


async def reset_page(ctx: HttpContext, token: str) -> Any:
    return await render("auth/ResetPassword", {"token": token, "valid": True})


async def reset(ctx: HttpContext, token: str) -> Any:
    body = await common.body_of(ctx)
    password = str(body.get("password") or "")
    if len(password) < MIN_PASSWORD:
        set_errors(ctx, {"password": f"Use at least {MIN_PASSWORD} characters."})
        return common.to(ctx, f"/reset-password/{token}")
    try:
        session = await common.client().as_user(None).reset_password(token, password)
    except Exception as error:  # noqa: BLE001
        failure = ApiFailure.of(error) if hasattr(error, "status_code") else None
        if failure is None:
            raise
        set_flash(ctx, "error", "That reset link has expired. Ask for a new one.")
        return common.to(ctx, "/forgot-password")
    if session.get("access_token"):
        common.api_of(ctx).remember(session)
        return common.to(ctx, "/")
    return common.to(ctx, "/login")


async def onboarding_page(ctx: HttpContext) -> Any:
    api = common.api_of(ctx)
    if not api.signed_in:
        return common.to(ctx, "/login")
    try:
        me, options = await common.gather(api.get("/account/me"), api.get("/onboarding/options"))
    except ApiFailure as error:
        return await explain(ctx, error)
    if me["stores"] and not ctx.query_params.get("new"):
        return await render("auth/ChooseStore", {"stores": me["stores"]})
    return await render("auth/CreateStore", {"templates": options["templates"], "categories": options["categories"]})


async def create_store(ctx: HttpContext) -> Any:
    api = common.api_of(ctx)
    if not api.signed_in:
        return common.to(ctx, "/login")
    body = await common.body_of(ctx)
    body.pop("__files__", None)
    try:
        created = await api.call("POST", "/onboarding/stores", json={k: v for k, v in body.items() if v not in (None, "")})
    except ApiFailure as error:
        if error.status == 401:
            api.sign_out()
            return common.to(ctx, "/login")
        return common.flash_failure(ctx, error, fallback="/onboarding")
    ctx.session.set(STORE, created["store"]["slug"])
    set_flash(ctx, "success", f"{created['store']['name']} is ready.")
    return common.to(ctx, "/")


def routes() -> list[Route]:
    return [
        Route("/login", handler=login_page, methods=["GET"], name="login"),
        Route("/login", handler=login, methods=["POST"], name="login.store"),
        Route("/register", handler=register_page, methods=["GET"], name="register"),
        Route("/register", handler=register, methods=["POST"], name="register.store"),
        Route("/logout", handler=logout, methods=["POST"], name="logout"),
        Route("/forgot-password", handler=forgot_page, methods=["GET"], name="password.forgot"),
        Route("/forgot-password", handler=forgot, methods=["POST"], name="password.forgot.send"),
        Route("/reset-password/{token}", handler=reset_page, methods=["GET"], name="password.reset"),
        Route("/reset-password/{token}", handler=reset, methods=["POST"], name="password.reset.submit"),
        Route("/onboarding", handler=onboarding_page, methods=["GET"], name="onboarding"),
        Route("/onboarding/store", handler=create_store, methods=["POST"], name="onboarding.store"),
    ]

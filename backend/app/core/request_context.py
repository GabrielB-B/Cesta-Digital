from contextvars import ContextVar, Token
from dataclasses import dataclass


@dataclass(slots=True)
class RequestContext:
    request_id: str | None = None
    method: str | None = None
    path: str | None = None
    client_ip: str | None = None
    user_id: int | None = None
    user_email: str | None = None


_request_context: ContextVar[RequestContext | None] = ContextVar(
    "request_context",
    default=None,
)


def set_request_context(context: RequestContext) -> Token:
    return _request_context.set(context)


def reset_request_context(token: Token) -> None:
    _request_context.reset(token)


def get_request_context() -> RequestContext:
    context = _request_context.get()
    if context is None:
        context = RequestContext()
        _request_context.set(context)
    return context


def attach_authenticated_user(user_id: int | None, user_email: str | None) -> None:
    context = get_request_context()
    context.user_id = user_id
    context.user_email = user_email

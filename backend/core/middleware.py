import logging

from core.domain import API_PREFIX
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from auth.services import is_token_linked_to_correct_user, get_user_by_token
from fastapi import status

__all__ = [
    "create_already_authenticated_middleware",
    "create_login_middleware",
    "ORIGINS",
]
logger = logging.getLogger(__name__)


def _error_response(status_code: int, detail: str) -> JSONResponse:
    """Build the error response by hand.

    Starlette's `ExceptionMiddleware` sits *inside* the router, so an
    `HTTPException` raised from an `@app.middleware("http")` function is never
    translated into a response: it propagates to the server and becomes a 500.
    """
    return JSONResponse(status_code=status_code, content={"detail": detail})


ORIGINS = [
    # TODO: remove localhost when "production"
    # FastAPI dev server
    "http://localhost:8000",
    # Angular app
    "http://localhost:4200",
    # Postgres db
    "http://localhost:5173",
]


def create_login_middleware():
    async def login_required(request: Request, call_next):

        # List of paths that needs to be public accessible
        # TODO: remove `/docs` and `/openapi.json` when "production"
        api_paths = {API_PREFIX + "/auth" + path for path in ["/register", "/login"]}

        public_paths = api_paths | {"/docs", "/openapi.json"}

        # Allow access to public paths without authentication
        if request.url.path in public_paths:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if auth_header is None:
            return _error_response(
                status.HTTP_401_UNAUTHORIZED,
                "Unauthorized: No correct header found",
            )

        # Check if it starts with "Token "
        if not auth_header.startswith("Token "):
            return _error_response(
                status.HTTP_401_UNAUTHORIZED,
                "Invalid token format.",
            )

        # Extract the token
        token = auth_header.removeprefix("Token ")
        # Validate token and get user
        try:
            user = get_user_by_token(token)
        except HTTPException as exc:
            return _error_response(exc.status_code, exc.detail)

        # Add user to request state
        request.state.user = user

        return await call_next(request)

    return login_required


def create_already_authenticated_middleware():
    async def already_authenticated(request: Request, call_next):
        # `/login` is left out on purpose: it has to work with a stale token
        # still attached, see `auth.api.login`.
        checked_path = {API_PREFIX + "/auth/register"}

        if request.url.path not in checked_path:
            return await call_next(request)

        if (
            request.url.path in checked_path
            and request.headers.get("Authorization") is None
        ):
            return await call_next(request)

        # Check if user is already authenticated via token
        token = request.headers["Authorization"].removeprefix("Token ")
        try:
            user = get_user_by_token(token=token)
        except HTTPException as exc:
            return _error_response(exc.status_code, exc.detail)

        if not is_token_linked_to_correct_user(token=token, email=user.email):
            return _error_response(
                status.HTTP_403_FORBIDDEN,
                "Unauthorized: Token is not linked to the correct user",
            )
        if user.is_active:
            return _error_response(
                status.HTTP_403_FORBIDDEN,
                "You are already authenticated. Please logout first.",
            )

        return await call_next(request)

    return already_authenticated

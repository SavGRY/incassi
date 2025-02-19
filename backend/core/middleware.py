from core.domain import API_PREFIX
from fastapi import Request
from fastapi.responses import JSONResponse
from auth.services import is_token_linked_to_correct_user, get_user_by_token
from fastapi import status

__all__ = [
    "create_already_authenticated_middleware",
    "create_login_middleware",
    "ORIGINS",
]


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
        api_paths = {API_PREFIX + path for path in ["/register", "/login"]}

        public_paths = api_paths | {"/docs", "/openapi.json"}

        # Allow access to public paths without authentication
        if request.url.path in public_paths:
            return await call_next(request)

        try:
            # Get the Authorization header. Accessing the header as a dictionary
            # to handle the case where the header is not present with a KeyError.
            # This is a more Pythonic way to handle this situation.
            auth_header = request.headers["Authorization"]

            # Check if it starts with "Token "
            if not auth_header.startswith("Token "):
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "Invalid token format."},
                )

            # Extract the token
            token = auth_header.removeprefix("Token ")

            # Validate token and get user
            user = await get_user_by_token(token)

            # Add user to request state
            request.state.user = user

            return await call_next(request)

        except KeyError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Unauthorized: No correct header found"},
            )

    return login_required


def create_already_authenticated_middleware():
    async def already_authenticated(request: Request, call_next):
        checked_path: list[str] = ["/login", "/register"]

        if request.url.path not in checked_path:
            return await call_next(request)

        if (
            request.url.path in checked_path
            and request.headers.get("Authorization") is None
        ):
            return await call_next(request)

        try:
            # Check if user is already authenticated via token
            auth_header = request.headers["Authorization"]
            token = auth_header.removeprefix("Token ")
            user = await get_user_by_token(token=token)
            if not is_token_linked_to_correct_user(token=token, email=user.email):
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "Unauthorized: Token is not linked to the correct user"
                    },
                )
            if user.is_active:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "detail": "You are already authenticated. Please logout first."
                    },
                )
        except KeyError:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Unauthorized: No token found"},
            )
        except Exception:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": "A critical error occurred"},
            )

        return await call_next(request)

    return already_authenticated

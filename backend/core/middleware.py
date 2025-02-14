from fastapi import Request
from fastapi.responses import JSONResponse
from auth.services import get_user_by_token
from fastapi import status

__all__ = ["create_login_middleware", "ORIGINS"]

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
        public_paths = ["/register", "/login", "/docs", "/openapi.json"]

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

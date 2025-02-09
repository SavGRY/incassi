import os

SECRET_KEY = os.getenv("SECRET_KEY", None)
ALGORITHM = os.getenv("ALGORITHM", "")

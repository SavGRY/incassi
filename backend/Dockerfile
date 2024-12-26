FROM python:3.13-slim-bookworm

WORKDIR /backend

COPY requirements.txt .

RUN apt-get update && \
    apt-get upgrade && \
    apt-get install -y gcc libpq-dev cargo

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

CMD ["uvicorn", "core.main:app", "--host", "0.0.0.0", "--port", "8000"]

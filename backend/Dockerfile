FROM python:3.14-slim-bookworm

WORKDIR /backend

# weasyprint runtime libs; everything else ships as prebuilt wheels
RUN apt-get update -y && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

CMD ["uvicorn", "core.main:app", "--host", "0.0.0.0", "--port", "8000"]

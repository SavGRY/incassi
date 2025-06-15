FROM python:3.13-slim-bookworm

WORKDIR /backend

COPY requirements.txt .

RUN apt-get update -y && \
    apt-get upgrade -y && \
    apt-get install -y gcc libpq-dev cargo && \
    # weasyprint libs
    apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 libjpeg-dev libopenjp2-7-dev libffi-dev

RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

CMD ["uvicorn", "core.main:app", "--host", "0.0.0.0", "--port", "8000"]

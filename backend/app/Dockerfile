FROM python:3.12-slim-bookworm
LABEL maintainer="Rudy Savini"

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update -y && \
    apt-get upgrade -y && \
    apt-get dist-upgrade -y

# Dependecies needed
ADD requirements.txt .

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

COPY . .

EXPOSE 8000

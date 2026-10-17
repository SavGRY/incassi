FROM node:24-slim
LABEL maintainer="Rudy Savini"

WORKDIR /incassi

RUN apt-get update -y && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci && npm cache clean --force

COPY . .

EXPOSE 4200 49153

CMD ["npm", "run", "start"]

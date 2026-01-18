FROM node:24-alpine3.20
LABEL maintainer="Rudy Savini"

WORKDIR /incassi

RUN apk update &&\
    apk upgrade --no-cache &&\
    apk add --no-cache g++ gcc libgcc libstdc++ linux-headers make python3 firefox py3-pip

COPY package*.json .

RUN npm install

COPY . .

EXPOSE 4200 49153

CMD ["npm", "run", "start"]

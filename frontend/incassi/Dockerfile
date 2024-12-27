FROM node:22-alpine3.18
LABEL maintainer="Rudy Savini"

WORKDIR /incassi

RUN apk update &&\
    apk upgrade --no-cache &&\
    apk add --no-cache g++ gcc libgcc libstdc++ linux-headers make python3 firefox py3-pip

COPY . .

RUN npm install

EXPOSE 4200 49153

CMD ["npm", "run", "start"]

FROM node:21-alpine3.18
LABEL maintainer="Rudy Savini"

WORKDIR /frontend

COPY package.json .

RUN npm install

COPY . .

EXPOSE 4200 49153
CMD ["npm", "start"]



FROM node:24-alpine
LABEL maintainer="Rudy Savini"

WORKDIR /incassi

# canvas, needed by jscanify, has no prebuilt binary for musl: npm builds it
# against cairo, pango and the image libraries below.
RUN apk update &&\
    apk upgrade --no-cache &&\
    apk add --no-cache g++ gcc libgcc libstdc++ linux-headers make python3 firefox py3-pip &&\
    apk add --no-cache pkgconf cairo-dev pango-dev pixman-dev jpeg-dev giflib-dev librsvg-dev

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4200 49153

CMD ["npm", "run", "start"]

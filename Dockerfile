FROM node:25.9.0-alpine
WORKDIR /usr/src/app

COPY . /usr/src/app

CMD ["node", "index.js"]
FROM node:26.5.0-alpine
WORKDIR /usr/src/app

COPY . /usr/src/app

CMD ["node", "index.js"]
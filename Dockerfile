FROM node:26.7.0-alpine
WORKDIR /usr/src/app

COPY . /usr/src/app

CMD ["node", "index.js"]
FROM node:25.8.1-alpine
WORKDIR /usr/src/app

COPY . /usr/src/app

CMD ["node", "index.js"]
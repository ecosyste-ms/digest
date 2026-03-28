FROM node:25.8.2-alpine
WORKDIR /usr/src/app

COPY . /usr/src/app

CMD ["node", "index.js"]
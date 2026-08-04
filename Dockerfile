FROM node:26.5.1-alpine
WORKDIR /usr/src/app

COPY . /usr/src/app

CMD ["node", "index.js"]
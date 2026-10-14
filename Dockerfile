FROM node:26.11.1-alpine
WORKDIR /usr/src/app

COPY . /usr/src/app

CMD ["node", "index.js"]
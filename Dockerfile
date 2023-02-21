FROM node:19.6.1-alpine
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV NODE_ENV production

COPY package.json package-lock.json /usr/src/app/
RUN npm ci

COPY . /usr/src/app

CMD npm start
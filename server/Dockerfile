FROM node:20.11.1-alpine

WORKDIR /usr/src/app

COPY package.json ./

RUN yarn

COPY ./ ./

CMD ["yarn", "dev"]
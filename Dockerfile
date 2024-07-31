FROM node:lts

RUN mkdir /app
WORKDIR /app

COPY ./bin/ /app/bin/
COPY ./lib/ /app/lib/
COPY ./index.mjs /app/
COPY ./package.json /app/
COPY ./package-lock.json /app/

RUN npm ci

CMD npm start
FROM node:6

COPY package.json /home/app/

WORKDIR /home/app/

RUN npm install

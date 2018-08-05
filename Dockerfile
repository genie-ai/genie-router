FROM node:8

COPY package.json /home/app/

WORKDIR /home/app/

RUN npm install

CMD ["npm", "start"]

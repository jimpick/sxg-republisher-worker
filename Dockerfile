# https://nodejs.org/de/docs/guides/nodejs-docker-webapp/
FROM node:11.13.0-stretch
RUN apt-get update
RUN apt-get dist-upgrade -y
WORKDIR /usr/src/sxg-publisher
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 80
ENV PORT=80
CMD [ "npm", "start" ]

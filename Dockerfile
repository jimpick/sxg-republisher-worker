# https://nodejs.org/de/docs/guides/nodejs-docker-webapp/
FROM node:11.13.0-stretch
RUN apt-get update
RUN apt-get dist-upgrade -y
WORKDIR /usr/local
RUN wget -q https://dl.google.com/go/go1.12.2.linux-amd64.tar.gz
RUN tar -xf go1.12.2.linux-amd64.tar.gz
RUN rm go1.12.2.linux-amd64.tar.gz
ENV GOROOT=/usr/local/go
RUN groupadd -r sxg && useradd --no-log-init -r -g sxg sxg
WORKDIR /home/sxg
RUN chown -R sxg. .
USER sxg
ENV GOPATH=/home/sxg/go
ENV PATH=$GOPATH/bin:$GOROOT/bin:$PATH
RUN mkdir go
RUN go get -u github.com/WICG/webpackage/go/signedexchange/cmd/...
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
ENV PORT=8080
CMD [ "npm", "start" ]

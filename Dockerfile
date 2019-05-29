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
ENV IPGET_VER=v0.3.1
ENV IPGET_TARBALL=ipget_${IPGET_VER}_linux-amd64.tar.gz
RUN wget -q https://dist.ipfs.io/ipget/$IPGET_VER/${IPGET_TARBALL}
RUN tar xf ipget*.tar.gz
RUN rm ${IPGET_TARBALL}
ENV PATH=/home/sxg/ipget:$PATH
RUN type ipget
RUN git clone https://github.com/jedisct1/encpipe.git
RUN mkdir bin
WORKDIR /home/sxg/encpipe
RUN pwd
RUN make
RUN cp encpipe /home/sxg/bin
ENV PATH=/home/sxg/bin:$PATH
WORKDIR /home/sxg
RUN rm -rf encpipe
COPY package*.json ./
COPY *.js ./
COPY start.sh ./
COPY public ./public/
RUN npm install
EXPOSE 8080
ENV PORT=8080
CMD [ "bash", "./start.sh" ]

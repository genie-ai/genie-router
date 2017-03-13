genie-router
=============

[![Build Status](https://travis-ci.org/matueranet/genie-router.svg?branch=develop)](https://travis-ci.org/matueranet/genie-router)

A generic platform that routes commands and conversations from voice or text-based clients to 3rd party backends.

[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

# Installation and running

This project is not yet published as a module in NPM, so for now clone it manually and install its modules:

```
git clone https://github.com/matueranet/genie-router.git
cd genie-router
npm install
```

This will make genie-router available in the directory you cloned the repository in.

genie-router and its plugins must be configured with the configuration file. It must be provided at startup:

    ./bin/genie-router -c config.json

See [config.json.example](https://github.com/matueranet/genie-router/blob/develop/config.json.dist) for more details.


## Configuration
See [read-config](https://www.npmjs.com/package/read-config) documentation for more details.

### Clients

To enable a client, include its name in the `clients` attribute in the `config.json`.

#### Telegram

The [Telegram bot API](https://core.telegram.org/bots/api) can be used as a client for input. Simply follow
the instructions on the Telegram bot API explanation page to acquire a token for your bot. Place that token
in your client configuration, for example:

```json
{
  "clients": {
    "telegram": {
      "token": "<token goes here>",
      "password": "genie"
    }
  }
}
```

The password configuration attribute is optional, and can be used to require a password
before someone can send commands via Telegram. As there is no persistent storage yet,
the password will have to be entered every time genie-router starts. As soon as persistent
storage is implemented the allowed chatIds will be persisted and remembered.

To not require a password, simply remove the attribute or set it to null.

### Brains

Currently, genie-router only supports one brain at a time. Multiple brains
can be enabled at the same time, but only the brain with the name configured
in the configuration attribute `defaultBrain` is used.

#### wit.ai

This brain uses the [wit.ai](https://wit.ai) service to generate a response to input
from a client.

Create an app at wit.ai, navigate to its settings and copy the API key from the _API Details_
section.

```json
{
  "brains": {
    "wit": {
      "accessToken": "<token goes here>"
    }
  }
}
```

#Docker

Create image by running:

    docker build -t genie-router .

Create container by running:

    docker run --name genie-router -v `pwd`:/home/app -v /home/app/node_modules genie-router npm start

To keep the tests continuously running, create the container below:

  docker run --name genie-router-test -v `pwd`:/home/app -v /home/app/node_modules genie-router ./node_modules/.bin/nodemon ./node_modules/.bin/standard

## Brains

A separate repository is created that provides simple set up for the brains support by genie-router.

If you are also running genie-router from a docker container, you need to set up a virtual network using
[docker network connect](https://docs.docker.com/engine/reference/commandline/network_connect/).

```
docker network create -d bridge --subnet 172.25.0.0/16 genie-network
docker network connect genie-network genie-router
docker network connect genie-network <brain-container-name>
```

Where you replace <brain-container-name> with the name of the container of the brain. This
can be repeated multiple times if a brain consists of multiple containers.

In the _genie-router_ container the name of the brain container can be used to connect to it.

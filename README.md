genie-router
=============

A generic platform that routes commands and conversations from voice or text-based clients to 3rd party backends.

[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

# Run

genie-router and its plugins must be configured with the configuration file. It must be provided at startup:

    genie-router -c config.json

See [config.json.example](https://github.com/matueranet/genie-router/blob/develop/config.json.dist) for more details.


## Configuration

See [read-config](https://www.npmjs.com/package/read-config) documentation for more details.

### Clients

#### Telegram

The [Telegram bot API](https://core.telegram.org/bots/api) can be used as a client for input. Simply follow
the instructions on the Telegram bot API explanation page to acquire a token for your bot. Place that token
in your client configuration, for example

```json
{
  "clients": {
    "telegram": {
      "token": "<token goes here>"
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

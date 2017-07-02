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

See [config.json.dist](https://github.com/matueranet/genie-router/blob/develop/config.json.dist) for more details.

## As a module

_genie-router_ can also be used as a module in your existing project.

```
npm install --save matueranet/genie-router
```

Then you can initialize the router via:

```
const app = new Router(config)
```

Here you need to parse and provide the configuration object yourself, the same structure is
expected as the standalone version.

# Configuration

Copy `config.json.dist` and update the values to your liking.
See [read-config](https://www.npmjs.com/package/read-config) documentation for more details on how values can be declared.

## HTTP

To enable HTTP support in general (in a future release the plugins can use the http library to
handle HTTP requests themselves), add a `http` attribute to the config:

```json
"http": {
  "enabled": true,
  "port": 3001
}
```
You need to set `enabled` to `true` and configure the port on which to listen on. The default is 3001.
When http is enabled, you can configure the HTTP API.

```json
"httpApi": {
  "enabled": true,
  "endpoint": "/api/message",
  "timeout": 5000,
  "accessToken": "protection-enabled"
}
```

When enabled, you can define the endpoint to which the API should listen (e.g. http://localhost:3001/api/message). The timeout
how long the request should wait for the invoked brain to respond. And optionally protect the API with a accessToken.
If the `accessToken` attribute is set, each request should include a `Authorization: Bearer [accessToken]` header.

## Clients

### Telegram

The [Telegram bot API](https://core.telegram.org/bots/api) can be used as a client for input. Simply follow
the instructions on the Telegram bot API explanation page to acquire a token for your bot. Place that token
in your client configuration, for example:

```json
{
  "plugins": {
    "telegram-bot": {
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

## Brains

### wit.ai

This brain uses the [wit.ai](https://wit.ai) service to generate a response to input
from a client.

Create an app at wit.ai, navigate to its settings and copy the API key from the _API Details_
section.

```json
{
  "plugins": {
    "wit": {
      "accessToken": "<token goes here>"
    }
  }
}
```

# HTTP API

A HTTP API is implemented so that external services can invoke the router, without having
to create a client plugin.

If the `accessToken` attribute is set, each request should include a `Authorization: Bearer [accessToken]` header.

The requests towards the API endpoint should always be **POST**.

### Request / response

The request should have be a JSON object, with at least an `input` attribute. You can optionally
include a `metadata` attribute which will be returned in the request.

```json
{
  "input": "Hello genie!",
  "metadata": {
    "internal-request-id": 5
  }
}
```

The responses will contain a unique identifier for each request, in the `id` attribute.

## Response

```json
{
  "id": "110ec58a-a0f2-4ac4-8393-c866d813b8d1",
  "message": "How may I help you, master?",
  "metadata": {
    "internal-request-id": 5
  }
}
```

## Errors

```json
{
  "id": "110ec58a-a0f2-4ac4-8393-c866d813b8d1",
  "error": "Timeout contacting brain."
}
```

#Docker

Create image by running:

    docker build -t genie-router .

Create container by running:

    docker run --name genie-router -v `pwd`:/home/app -v /home/app/node_modules genie-router npm start

To keep the tests continuously running, create the container below:

    docker run --name genie-router-test -v `pwd`:/home/app -v /home/app/node_modules genie-router ./node_modules/.bin/nodemon ./node_modules/.bin/standard

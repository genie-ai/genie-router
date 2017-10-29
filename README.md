genie-router
=============

[![Build Status](https://travis-ci.org/matueranet/genie-router.svg?branch=develop)](https://travis-ci.org/matueranet/genie-router) [![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/) [![Coverage Status](https://coveralls.io/repos/github/matueranet/genie-router/badge.svg?branch=develop)](https://coveralls.io/github/matueranet/genie-router?branch=develop)

A generic platform that routes commands and conversations from voice or text-based clients to 3rd party backends.
Functionality is added via plugins, checkout the **Plugins** section for more information.

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

## Plugin location

When genie-router starts it will attempt to load its plugin. The default location is `$HOME/.genie-router`,
if that location does not exist, it will be created, the echo and cli-local plugin will
be installed by default.

You can override the default plugin location, by using the `pluginStore` configuration
attribute. When you override the location, make sure that the configured path exists,
genie-router will not attempt to create it.

```
"pluginStore": {
  "location": "/home/user/.config/genie-router"
}
```

## HTTP

To enable HTTP support in general (plugins can use the http library to
handle HTTP requests themselves), add a `http` attribute to the config:

```json
"http": {
  "enabled": true,
  "port": 3001
}
```
You need to set `enabled` to `true` and configure the port on which to listen on. The default is 3001.
When http is enabled, you can install plugins exposing HTTP urls.

There is a [HTTP API](https://github.com/matueranet/genie-router-plugin-api-http) plugin available that
exposes a way for external clients to send a message using genie-router.

# Plugins

Plugins can be installed by running `npm install <plugin-identifier>` in the plugins
folder. Then create an entry in the `config.json` file in the `plugins` attribute with
the key of the plugin. Include any additional configuration information as explained
in the plugin readme.

Implementing your own is simple. You need to implement a npm module of which the index
returned is an object with a `client`, `brain` or `brainSelector` attribute, which is a function.
See the cli-local or echo plugins for simple examples.

## Types

There are four types of plugins, clients, brains, listeners and brain selectors. One plugin must
be at least one of these three types, but an also be a combination of them.

A client takes input and echoes the resulting output. A brain takes text as input,
does something with it, and returns an output. Brain selectors parse the input text
and return the name of a brain to use for processing the input. Listeners can listen to
events, currently only `input.heard` and `output.reply` are supported.

## Overview

| Name | Type | Key | Description | Installation | URL |
| ---- |----- |---- | ----------- | ------------ | --- |
| HTTP Api | Client | api-http | Provides a generic HTTP API for external clients. | `npm install matueranet/genie-router-plugin-api-http` | [genie-router-plugin-api-http](https://github.com/matueranet/genie-router-plugin-api-http) |
| Brain Mentions | BrainSelector | brain-mentions | selects a brain if its name is mentioned in the first words of an input, or an alias is defined | `npm install matueranet/genie-router-plugin-brain-mentions` | [genie-router-plugin-brain-mentions](https://github.com/matueranet/genie-router-plugin-brain-mentions) |
| Telegram Bot | Client | telegram-bot | Enables a bot with the Telegram Bot API for input/output.  | `npm install matueranet/genie-router-plugin-telegram-bot` | [genie-router-plugin-telegram-bot](https://github.com/matueranet/genie-router-plugin-telegram-bot) |
| Rivescript | Brain | rivescript | Allows genie-router to use rivescript as a brain. | `npm install matueranet/genie-router-plugin-rivescript` | [genie-router-plugin-rivescript](https://github.com/matueranet/genie-router-plugin-rivescript) |
| Facebook Messenger | Client | facebook-messenger | Enables the use of FB Messenger as a client. | `npm install matueranet/genie-router-plugin-facebook-messenger` | [genie-router-plugin-facebook-messenger](https://github.com/matueranet/genie-router-plugin-facebook-messenger) |
| Dialogflow (Api.ai) | Brain | dialogflow | Use [Dialogflow](https://dialogflow.com) as a brain to handle input | `npm install matueranet/genie-router-plugin-dialogflow` | [genie-router-plugin-dialogflow](https://github.com/matueranet/genie-router-plugin-dialogflow) |
| Dashbot | Listener | dashbot | Log transcripts to [dashbot.io](https://dashbot.io) | `npm install matueranet/genie-router-plugin-dashbot` | [genie-router-plugin-dashbot](https://github.com/matueranet/genie-router-plugin-dashbot) |
| Sentry | HTTP | sentry | Log any error to [sentry.io](https://sentry.io) | `npm install matueranet/genie-router-plugin-sentry` | [genie-router-plugin-sentry](https://github.com/matueranet/genie-router-plugin-sentry) |
| CLI Local | Client | cli-local | Send input in the terminal where genie-router was started | `npm install matueranet/genie-router-plugin-cli-local` | [genie-router-plugin-cli-local](https://github.com/matueranet/genie-router-plugin-cli-local) |
| Echo | Brain | echo | Echoes all input back | `npm install matueranet/genie-router-plugin-echo` | [genie-router-plugin-echo](https://github.com/matueranet/genie-router-plugin-echo) |
| Gladys | Brain | gladys | Use [Gladys](https://gladysproject.com) to process input | `npm install matueranet/genie-router-plugin-gladys` | [genie-router-plugin-gladys](https://github.com/matueranet/genie-router-plugin-gladys) |

Want your plugin added here? Update the readme and create a [Pull Request](https://github.com/matueranet/genie-router/pulls).

# Docker

Build image by running:

    docker build -t genie-router .

Create container by running:

    docker run --name genie-router -v `pwd`:/home/app -v /home/app/node_modules genie-router npm start

To keep the tests continuously running, create the container below:

    docker run --name genie-router-test -v `pwd`:/home/app -v /home/app/node_modules genie-router ./node_modules/.bin/nodemon ./node_modules/.bin/standard

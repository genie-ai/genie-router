genie-router
=============

[![Build Status](https://travis-ci.org/genie-ai/genie-router.svg?branch=develop)](https://travis-ci.org/genie-ai/genie-router)

A generic platform that routes commands and conversations from voice or text-based clients to 3rd party backends.
Functionality is added via plugins, checkout the **Plugins** section for more information.

View online [demo](https://www.matuera.net/genie-router/demo).

# Installation and running

## Globally

```
npm install -g genie-router
```

This will make genie-router globally available on the system.

genie-router and its plugins must be configured with the configuration file. It must be provided at startup:

    genie-router -c config.json

See [config.json.dist](https://github.com/genie-ai/genie-router/blob/develop/config.json.dist) for more details.

## Via git

```
git clone https://github.com/genie-ai/genie-router.git
cd genie-router
npm install
```

This will make genie-router available in the directory you cloned the repository in.
Run genie-router using `./bin/genie-router -c config.json`.

## As a module

_genie-router_ can also be used as a module in your existing project.

```
npm install --save genie-router
```

Then you can initialize the router via:

```
const app = new Router(config)
```

Here you need to parse and provide the configuration object yourself.

# Configuration

Copy `config.json.dist` and update the values to your liking.
See [read-config](https://www.npmjs.com/package/read-config) documentation for more details on how values can be declared.

## Plugin location

When genie-router starts it will attempt to load its plugins. The default location is `$HOME/.genie-router`,
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

## Storage location

It is possible for plugins to store data persistently, such as authorized sessions and other small amounts
of data. The data is all stored in a JSON file, namespaced per plugin. By default it is stored in `${USER}/.genie-router/storage.json` but the location of the file can be configured.

```
"storage": {
    "location": "/etc/genie-router/store.json"
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

There is a [HTTP API](https://github.com/genie-ai/genie-router-plugin-api-http) plugin available that
exposes a way for external clients to send a message using genie-router.

## Brains

`defaultBrain` is the brain that should be selected by default when no _brainSelector_ returns a brain suggestion. The
`brainStickiness` is the time period (in seconds) when a previously selected brain in a client overrides the configured default brain.
The default value for the stickiness is 120 seconds.

A small example to explain it some more:

1. The brain-mentions plugin is used to be able to select a different brain by using its name
2. The default brain is _echo_, but the _google-assistant_ is also used.
3. When the user inputs something, the input is simply echood by the _echo_ plugin
4. The user types _ask google-assistant what is so special about 42?_
5. The stickiness of the brain now dictates that any input received that is not picked up
by a brainSelector is then handled by the _google_assistant_ plugin, not the default _echo_.

# Plugins

Plugins can be installed by running `npm install --save <plugin-identifier>` in the plugins
folder. Then create an entry in the `config.json` file in the `plugins` attribute with
the key of the plugin. Include any additional configuration information as explained
in the plugin readme.

Implementing your own is simple. You need to implement a npm module of which the index
returned is an object with a `client`, `brain` or `brainSelector` attribute, which is a function.
See the cli-local or echo plugins for simple examples.

## Types

There are four types of plugins: clients, brains, listeners and brain selectors. One plugin must
be at least one of these four types, but can also be a combination of them.

A client takes input and echoes the resulting output. A brain takes text as input,
does something with it, and returns an output. Brain selectors parse the input text
and return the name of a brain to use for processing the input. Listeners can listen to
events, currently only `input.heard` and `output.reply` are supported.

## Overview

| Name | Type | Key | Description | Installation | URL |
| ---- |----- |---- | ----------- | ------------ | --- |
| HTTP Api | Client | api-http | Provides a generic HTTP API for external clients. | `npm install @genie-ai/genie-router-plugin-api-http` | [genie-router-plugin-api-http](https://github.com/genie-ai/genie-router-plugin-api-http) |
| Brain Mentions | BrainSelector | brain-mentions | selects a brain if its name is mentioned in the first words of an input, or an alias is defined | `npm install @genie-ai/genie-router-plugin-brain-mentions` | [genie-router-plugin-brain-mentions](https://github.com/genie-ai/genie-router-plugin-brain-mentions) |
| Google Assistant | Brain | google-assistant | Enables google-assistant to supply the answers in genie-router  | `npm install @genie-ai/genie-router-plugin-google-assistant` | [genie-router-plugin-google-assistant](https://github.com/genie-ai/genie-router-plugin-google-assistant) |
| Telegram Bot | Client | telegram-bot | Enables a bot with the Telegram Bot API for input/output.  | `npm install @genie-ai/genie-router-plugin-telegram-bot` | [genie-router-plugin-telegram-bot](https://github.com/genie-ai/genie-router-plugin-telegram-bot) |
| Web Client | Client | web-client | Provides a webpage where input can be send  | `npm install @genie-ai/genie-router-plugin-web-client` | [genie-router-plugin-web-client](https://github.com/genie-ai/genie-router-plugin-web-client) |
| Rivescript | Brain | rivescript | Allows genie-router to use rivescript as a brain. | `npm install @genie-ai/genie-router-plugin-rivescript` | [genie-router-plugin-rivescript](https://github.com/genie-ai/genie-router-plugin-rivescript) |
| Facebook Messenger | Client | facebook-messenger | Enables the use of FB Messenger as a client. | `npm install @genie-ai/genie-router-plugin-facebook-messenger` | [genie-router-plugin-facebook-messenger](https://github.com/genie-ai/genie-router-plugin-facebook-messenger) |
| Dialogflow (Api.ai) | Brain | dialogflow | Use [Dialogflow](https://dialogflow.com) as a brain to handle input | `npm install @genie-ai/genie-router-plugin-dialogflow` | [genie-router-plugin-dialogflow](https://github.com/genie-ai/genie-router-plugin-dialogflow) |
| Dashbot | Listener | dashbot | Log transcripts to [dashbot.io](https://dashbot.io) | `npm install @genie-ai/genie-router-plugin-dashbot` | [genie-router-plugin-dashbot](https://github.com/genie-ai/genie-router-plugin-dashbot) |
| Sentry | HTTP | sentry | Log any error to [sentry.io](https://sentry.io) | `npm install @genie-ai/genie-router-plugin-sentry` | [genie-router-plugin-sentry](https://github.com/genie-ai/genie-router-plugin-sentry) |
| CLI Local | Client | cli-local | Send input in the terminal where genie-router was started | `npm install @genie-ai/genie-router-plugin-cli-local` | [genie-router-plugin-cli-local](https://github.com/genie-ai/genie-router-plugin-cli-local) |
| Echo | Brain | echo | Echoes all input back | `npm install @genie-ai/genie-router-plugin-echo` | [genie-router-plugin-echo](https://github.com/genie-ai/genie-router-plugin-echo) |

Want your plugin added here? Update the readme and create a [Pull Request](https://github.com/genie-ai/genie-router/pulls).

const express = require('express');
const bodyparser = require('body-parser');
const debug = require('debug')('genie-router:http');
const getFromObject = require('../utils/getFromObject');

let app = null;

async function start(config) {
    // start is invoked earlier and http is enabled, return the initialized app
    if (app !== null) {
        return app;
    }

    app = express();
    app.use(bodyparser.json({ type: 'application/json' }));
    app.listen(getFromObject(config, 'port', 3001));
    debug('Listening for HTTP on port %d', config.port);
    return app;
}

module.exports = start;

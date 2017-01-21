genie-router
=============

A generic platform that routes commands and conversations from voice or text-based clients to 3rd party backends.

[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

#Docker

Create image by running:

    docker build -t genie-router .

Create container by running:

    docker run --name genie-router -v `pwd`:/home/app -v /home/app/node_modules genie-router npm start

To keep the tests continuously running, create the container below:

  docker run --name genie-router-test -v `pwd`:/home/app -v /home/app/node_modules genie-router ./node_modules/.bin/nodemon ./node_modules/.bin/standard

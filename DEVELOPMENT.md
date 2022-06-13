# Development

## Setup

First things first, you'll need to fork and clone the repository to your local machine.

`git clone https://github.com/ecosyste-ms/digest.git`

The project uses ruby on rails which have a number of system dependencies you'll need to install. 

- [node.js 18+](https://nodejs.org/en/download/)

Once you've got all of those installed, from the root directory of the project run the following commands:

```
npm install
npm start
```

You can then load up [http://localhost:8080](http://localhost:8080) to access the service.

### Docker

Alternatively you can use the existing docker configuration files to run the app in a container.

Run this command from the root directory of the project to start the service.

`docker-compose up --build`

You can then load up [http://localhost:8080](http://localhost:8080) to access the service.

## Tests

The applications tests can be found in [test](test) and use the built in testing framework https://nodejs.org/api/test.html.

You can run all the tests with:

`npm test`

## Deployment

A container-based deployment is highly recommended, we use [dokku.com](https://dokku.com/).
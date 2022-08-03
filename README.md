# Attribute Base Access Control Application in Nestjs

## Description

This application uses [Nest](https://github.com/nestjs/nest) to create an Attribute Base Access Control system for your applications. It's inspired by the [Policies system that AWS uses](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_controlling.html)

The policies and users are stored in database, in this case in a MongoDB database. You can assign policies to users to give ability to access to resources o create them

## Extending the Application

You can crete your own modules following [the principles described in Nestjs](https://docs.nestjs.com/modules). Then you need to implement the ABAC security in the controller

- Create a list of actions like the one you can find in [user.actions](src/auth/actions/user.actions.ts) that described the operations that your users can do
- Create the handler for that actions that te one you can find in [user.handler](src/auth/handlers/user.handler.ts)
- Update your controller with the `@CheckPolicies` decorator to check your policies. You can find an example in the [user.controller](src/auth/controllers/user.controller.ts)

## TODOs

- [ ] Make the ABAC system agnostic to the database engine

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

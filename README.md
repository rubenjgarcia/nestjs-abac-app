# Attribute Base Access Control Application in Nestjs

## Description

This application uses [Nest](https://github.com/nestjs/nest) to create an Attribute Base Access Control system for your applications. It's inspired by the [Policies system that AWS uses](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_controlling.html)

The `policies` and `users` are stored in database, in this case in a MongoDB database. You can assign `policies` to `users` to give ability to access to resources or create them

## How it works

In this application you have `users` which have `policies` that tell us what kind of actions they can do

The `policies` are permissions for the API endpoints

Let's assume that we have this `user`:

```
{
    "email": "foo@example.com",
    "policies": [
        {
            "name": "FooPolicy",
            "effect": "Allow",
            "actions": ["User:ListUsers"],
            "resources": ["*"]
        }
    ]
}
```

This `user` can `ListUsers` and that permission is neccesary to call the `GET /users` endpoint

You can restrict which resources the `users` can see:

```
{
    "email": "foo@example.com",
    "policies": [
        {
            "name": "FooPolicy",
            "effect": "Allow",
            "actions": ["User:UpdateUser"],
            "resources": ["000000000001"]
        }
    ]
}
```

In this case the `user` can only update the `user` with `id` equals to `000000000001`

### Conditions

You can use `conditions` on the `policies`:

```
{
    "email": "foo@example.com",
    "policies": [
        {
            "name": "FooPolicy",
            "effect": "Allow",
            "actions": ["User:GetUser"],
            "resources": ["*"],
            "conditions": { "StringEquals": { "email": "foo@example.com" } }
        }
    ]
}
```

This `user` only can call `GET /user/:id` if the `email` of the `user` with that `id` is `foo@example.com`

### Groups

The `user` can belongs to zero or more groups. If the `user` belongs to a group it will inherit the `policies` from that group and will be added to the `policies` of the `user`

### Organizations and units

When you create a `organization` a new `unit` is created with it. One `organization` can have more than one `unit` but need to have at least one `unit`. Every `unit` can have other `units` creating the **organization tree**

Every entity of the application needs to belong to a `unit`. For example, `users` or `policies` belongs to an `unit`

When you do a query with an `user` you can only see entities that belongs to the `unit` of that `user`

## Extending the Application

You can crete your own modules following [the principles described in Nestjs](https://docs.nestjs.com/modules). Then you need to implement the ABAC security in the controller

- Create a list of actions like the one you can find in [user.actions](src/auth/actions/user.actions.ts) that described the operations that your users can do
- Create the handler for that actions that te one you can find in [user.handler](src/auth/handlers/user.handler.ts)
- Update your controller with the `@CheckPolicies` decorator to check your policies. You can find an example in the [user.controller](src/auth/controllers/user.controller.ts)

### Auto generating new modules

First you have to compile the generator tool

```
npm run build:generator
```

Now you can use it to generate a new module with all the code neccesary (controller, service, tests, ...)

```
npm run generate
```

The schema will be generated without any properties so you have to do it for yourself. As well, you have to create the tests that check the schema and the conditions. You can find these tests searching for `TODO` in your module tests

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

## CLI Utils

This project has a CLI to do some actions. If you want to use it you have to compile the CLI tool

```
npm run build:cli
```

Then you can use with the command `npm run cli` follow by the command of the CLI you want to use

### Organizations command

The CLI has a command called `organizations` that you can use to do things related with organizations

#### Create an organization

You can create an `organization` using the CLI tool. Just use the sub command `creat` and pass the name that you want to give to the `organization`. Here is an example:

```
npm run cli organizations create Foo
```

This will generate an `organization` with name `Foo`. An `unit` called `Main` will be created under the `organization`

### Users command

The CLI has a command called `users` that you can use to do things related with users

#### Create admin user

You can create an admin user using the CLI tool. Just use the sub command `create-admin` and pass the unit id, email and the password you want. Here is an example:

```
npm run cli users create-admin 123456789012 foo@example.com bar
```

This will generate an user with email `foo@example.com` with password `bar`. First, it will check if a policy called `Administrator` is in the database. If there is no policy it will create it with **all** the permissions. The policy `Administrator` will be assign to the user created

## TODOs and improvements
- [ ] Cache JWT lookups
- [ ] Prompt and generate only files selected, i.e. controller, service, e2e-test, ...
- [ ] Implement tree based conditions: _This tree can be used to give the `user` permissions based on the `conditions` `OrganizationEquals`, `UnitEquals`, `UnitPath`_

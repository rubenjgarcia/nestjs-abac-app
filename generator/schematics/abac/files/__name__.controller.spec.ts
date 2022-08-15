import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as mocks from 'node-mocks-http';
import { <%= singular(classify(name)) %>Controller } from './<%= name %>.controller';
import { <%= singular(classify(name)) %>Service } from './<%= name %>.service';
import { Effect } from '../framework/factories/casl-ability.factory';
import {
    Create<%= singular(classify(name)) %>,
    Get<%= singular(classify(name)) %>,
    List<%= classify(name) %>,
    <%= singular(classify(name)) %>Scope,
    Remove<%= singular(classify(name)) %>,
    Update<%= singular(classify(name)) %>,
  } from './<%= name %>.actions';

describe('<%= singular(classify(name)) %>Controller', () => {
  let <%= singular(name) %>Controller: <%= singular(classify(name)) %>Controller;
  let <%= singular(name) %>Service: <%= singular(classify(name)) %>Service;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [<%= singular(classify(name)) %>Controller],
      providers: [
        {
          provide: <%= singular(classify(name)) %>Service,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
            }),
            findAll: jest.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId('000000000000'),
              },
              {
                _id: new Types.ObjectId('000000000001'),
              },
            ]),
            create: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
            }),
            update: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
            }),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    <%= singular(name) %>Service = module.get<<%= singular(classify(name)) %>Service>(<%= singular(classify(name)) %>Service);
    <%= singular(name) %>Controller = module.get<<%= singular(classify(name)) %>Controller>(<%= singular(classify(name)) %>Controller);
  });

  describe('create', () => {
    it('should create a <%= singular(name) %>', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Create<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        ],
      };
      await expect(
        <%= singular(name) %>Controller.create({ }, request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
      });
      expect(<%= singular(name) %>Service.create).toHaveBeenCalledWith(
        { },
        request.user,
      );
    });
  });

  describe('findOne', () => {
    it('should return a <%= singular(name) %>', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Get<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        ],
      };
      await expect(<%= singular(name) %>Controller.findOne('foo', request)).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
      });

      expect(<%= singular(name) %>Service.findOne).toHaveBeenCalledWith('foo', request.user);
    });
  });

  describe('findAll', () => {
    it('should return an array of <%= name %>', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${List<%= classify(name) %>}`],
            resources: ['*'],
          },
        ],
      };
      await expect(<%= singular(name) %>Controller.findAll(request)).resolves.toEqual([
        {
          _id: new Types.ObjectId('000000000000'),
        },
        {
          _id: new Types.ObjectId('000000000001'),
        },
      ]);

      expect(<%= singular(name) %>Service.findAll).toHaveBeenCalledWith(request.user);
    });
  });

  describe('update', () => {
    it('should update a <%= singular(name) %>', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Update<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        ],
      };
      const update<%= singular(classify(name)) %>Dto = { };
      await expect(
        <%= singular(name) %>Controller.update('000000000000', update<%= singular(classify(name)) %>Dto, request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
      });

      expect(<%= singular(name) %>Service.update).toHaveBeenCalledWith(
        '000000000000',
        update<%= singular(classify(name)) %>Dto,
        request.user,
      );
    });
  });

  describe('remove', () => {
    it('should remove a <%= singular(name) %>', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${<%= singular(classify(name)) %>Scope}:${Remove<%= singular(classify(name)) %>}`],
            resources: ['*'],
          },
        ],
      };
      <%= singular(name) %>Controller.remove('000000000000', request);
      expect(<%= singular(name) %>Service.remove).toHaveBeenCalledWith(
        '000000000000',
        request.user,
      );
    });
  });
});

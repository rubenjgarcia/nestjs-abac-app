import { Test } from '@nestjs/testing';
import * as mocks from 'node-mocks-http';
import { <%= singular(classify(name)) %>Controller } from './<%= name %>.controller';
import { <%= singular(classify(name)) %>Service } from './<%= name %>.service';
import { Create<%= singular(classify(name)) %>Dto } from './dtos/create-<%= singular(name) %>.dto';
import { Update<%= singular(classify(name)) %>Dto } from './dtos/update-<%= singular(name) %>.dto';
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

  const create<%= singular(classify(name)) %>Dto: Create<%= singular(classify(name)) %>Dto = {};
  const update<%= singular(classify(name)) %>Dto: Update<%= singular(classify(name)) %>Dto = {};

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [<%= singular(classify(name)) %>Controller],
      providers: [
        {
          provide: <%= singular(classify(name)) %>Service,
          useValue: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
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
        unitId: '000000000000',
      };
      await <%= singular(name) %>Controller.create(create<%= singular(classify(name)) %>Dto, request)
      expect(<%= singular(name) %>Service.create).toHaveBeenCalledWith(
        create<%= singular(classify(name)) %>Dto,
        request.user,
        '000000000000'
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
        unitId: '000000000000',
      };
      await <%= singular(name) %>Controller.findOne('foo', request)
      expect(<%= singular(name) %>Service.findOne).toHaveBeenCalledWith('foo', request.user, '000000000000');
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
        unitId: '000000000000',
      };
      await <%= singular(name) %>Controller.findAll(request)
      expect(<%= singular(name) %>Service.findAll).toHaveBeenCalledWith(request.user, '000000000000');
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
        unitId: '000000000000',
      };
      await <%= singular(name) %>Controller.update('000000000000', update<%= singular(classify(name)) %>Dto, request)
      expect(<%= singular(name) %>Service.update).toHaveBeenCalledWith(
        '000000000000',
        update<%= singular(classify(name)) %>Dto,
        request.user,
        '000000000000'
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
        unitId: '000000000000',
      };
      await <%= singular(name) %>Controller.remove('000000000000', request);
      expect(<%= singular(name) %>Service.remove).toHaveBeenCalledWith(
        '000000000000',
        request.user,
        '000000000000'
      );
    });
  });
});

import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { <%= singular(classify(name)) %>Service } from './<%= name %>.service';
import { Create<%= singular(classify(name)) %>RequestDto } from './dtos/create-<%= singular(name) %>-request.dto';
import { Update<%= singular(classify(name)) %>RequestDto } from './dtos/update-<%= singular(name) %>-request.dto';
import { <%= singular(classify(name)) %>ResponseDto } from './dtos/<%= singular(name) %>-response.dto';
import {
  Get<%= singular(classify(name)) %>PolicyHandler,
  Create<%= singular(classify(name)) %>PolicyHandler,
  List<%= classify(name) %>PolicyHandler,
  Update<%= singular(classify(name)) %>PolicyHandler,
  Remove<%= singular(classify(name)) %>PolicyHandler,
} from './<%= name %>.handler';
import { CheckPolicies } from '../framework/decorators/check-policies.decorator';
import { JwtAuthGuard } from '../iam/auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../framework/guards/policies.guard';

@Controller(['<%= name %>'])
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class <%= singular(classify(name)) %>Controller {
  private readonly logger = new Logger(<%= singular(classify(name)) %>Controller.name);

  constructor(private readonly <%= singular(name) %>Service: <%= singular(classify(name)) %>Service) {}

  @Post()
  @CheckPolicies(new Create<%= singular(classify(name)) %>PolicyHandler())
  async create(
    @Body() create<%= singular(classify(name)) %>Dto: Create<%= singular(classify(name)) %>RequestDto,
    @Req() request: any,
  ): Promise<<%= singular(classify(name)) %>ResponseDto> {
    return await this.<%= singular(name) %>Service.create(create<%= singular(classify(name)) %>Dto, request.user, request.user.unitId);
  }

  @Get()
  @CheckPolicies(new List<%= classify(name) %>PolicyHandler())
  async findAll(@Req() request: any): Promise<<%= singular(classify(name)) %>ResponseDto[]> {
    return this.<%= singular(name) %>Service.findAll(request.user, request.user.unitId);
  }

  @Get(':id')
  @CheckPolicies(new Get<%= singular(classify(name)) %>PolicyHandler('id'))
  async findOne(
    @Param('id') id: string,
    @Req() request: any,
  ): Promise<<%= singular(classify(name)) %>ResponseDto> {
    return this.<%= singular(name) %>Service.findOne(id, request.user, request.user.unitId);
  }

  @Put(':id')
  @CheckPolicies(new Update<%= singular(classify(name)) %>PolicyHandler('id'))
  async update(
    @Param('id') id: string,
    @Body() update<%= singular(classify(name)) %>Dto: Update<%= singular(classify(name)) %>RequestDto,
    @Req() request: any,
  ): Promise<<%= singular(classify(name)) %>ResponseDto> {
    return this.<%= singular(name) %>Service.update(id, update<%= singular(classify(name)) %>Dto, request.user, request.user.unitId);
  }

  @Delete(':id')
  @CheckPolicies(new Remove<%= singular(classify(name)) %>PolicyHandler('id'))
  remove(@Param('id') id: string, @Req() request: any) {
    return this.<%= singular(name) %>Service.remove(id, request.user, request.user.unitId);
  }
}

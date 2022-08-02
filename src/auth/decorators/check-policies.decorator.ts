import { SetMetadata } from '@nestjs/common';
import { IPolicyHandler } from '../handlers/handler-definition';

export const CHECK_POLICIES_KEY = 'check_policy';
export const CheckPolicies = (...handlers: IPolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);

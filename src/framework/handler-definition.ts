import { Ability } from '@casl/ability';

export interface IPolicyHandler {
  handle(ability: Ability, params: unknown): boolean;
}

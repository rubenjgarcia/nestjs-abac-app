import { Path } from '@angular-devkit/core';

export interface AbacOptions {
  /**
   * The name of the resource.
   */
  name: string;
  /**
   * The path to create the resource.
   */
  path?: string | Path;
  /**
   * The path to insert the module declaration.
   */
  module?: Path;
}

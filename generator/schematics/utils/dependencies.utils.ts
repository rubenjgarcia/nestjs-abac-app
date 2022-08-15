/**
 * This file has been moved to the "@nestjs/schematics" to avoid pulling the entire "@schematics/angular" into Nest projects.
 * REF https://github.com/angular/angular-cli/blob/master/packages/schematics/angular/utility/dependencies.ts
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Tree } from '@angular-devkit/schematics';
import { JSONFile } from './json-file.util';

const PKG_JSON_PATH = '/package.json';
export enum NodeDependencyType {
  Default = 'dependencies',
  Dev = 'devDependencies',
  Peer = 'peerDependencies',
  Optional = 'optionalDependencies',
}

export interface NodeDependency {
  type: NodeDependencyType;
  name: string;
  version: string;
  overwrite?: boolean;
}

const ALL_DEPENDENCY_TYPE = [
  NodeDependencyType.Default,
  NodeDependencyType.Dev,
  NodeDependencyType.Optional,
  NodeDependencyType.Peer,
];

export function addPackageJsonDependency(
  tree: Tree,
  dependency: NodeDependency,
  pkgJsonPath = PKG_JSON_PATH,
): void {
  const json = new JSONFile(tree, pkgJsonPath);

  const { overwrite, type, name, version } = dependency;
  const path = [type, name];
  if (overwrite || !json.get(path)) {
    json.modify(path, version);
  }
}

export function getPackageJsonDependency(
  tree: Tree,
  name: string,
  pkgJsonPath = PKG_JSON_PATH,
): NodeDependency | null {
  const json = new JSONFile(tree, pkgJsonPath);

  for (const depType of ALL_DEPENDENCY_TYPE) {
    const version = json.get([depType, name]);

    if (typeof version === 'string') {
      return {
        type: depType,
        name: name,
        version,
      };
    }
  }

  return null;
}

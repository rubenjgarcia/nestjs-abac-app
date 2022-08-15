import { join, Path, strings } from '@angular-devkit/core';
import { classify } from '@angular-devkit/core/src/utils/strings';
import {
  apply,
  branchAndMerge,
  chain,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  SchematicsException,
  Source,
  template,
  Tree,
  url,
} from '@angular-devkit/schematics';
import * as pluralize from 'pluralize';
import { DeclarationOptions, ModuleDeclarator, ModuleFinder } from '../utils';
import { normalizeToKebabOrSnakeCase } from '../utils/formatting';
import { Location, NameParser } from '../utils/name.parser';
import { mergeSourceRoot } from '../utils/source-root.helpers';
import { AbacOptions } from './abac.schema';

export function main(options: AbacOptions): Rule {
  options = transform(options);

  return (tree: Tree, context: SchematicContext) => {
    return branchAndMerge(
      chain([
        mergeSourceRoot(options),
        addDeclarationToModule(options),
        mergeWith(generate(options)),
      ]),
    )(tree, context);
  };
}

function transform(options: AbacOptions): AbacOptions {
  const target: AbacOptions = Object.assign({}, options);
  if (!target.name) {
    throw new SchematicsException('Option (name) is required.');
  }

  const location: Location = new NameParser().parse(target);
  target.name = normalizeToKebabOrSnakeCase(location.name);
  target.path = normalizeToKebabOrSnakeCase(location.path);
  target.path = join(target.path as Path, target.name);

  return target;
}

function generate(options: AbacOptions): Source {
  return (context: SchematicContext) =>
    apply(url('./files'), [
      template({
        ...strings,
        ...options,
        lowercased: (name: string) => {
          const classifiedName = classify(name);
          return (
            classifiedName.charAt(0).toLowerCase() + classifiedName.slice(1)
          );
        },
        singular: (name: string) => pluralize.singular(name),
      }),
      move(options.path),
    ])(context);
}

function addDeclarationToModule(options: AbacOptions): Rule {
  return (tree: Tree) => {
    options.module = new ModuleFinder(tree).find({
      name: options.name,
      path: options.path as Path,
    });
    if (!options.module) {
      return tree;
    }
    const content = tree.read(options.module).toString();
    const declarator: ModuleDeclarator = new ModuleDeclarator();
    tree.overwrite(
      options.module,
      declarator.declare(content, {
        ...options,
        type: 'module',
      } as DeclarationOptions),
    );
    return tree;
  };
}

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function loadSchema(name) {
  return loadJson(join(ROOT, 'schemas', `${name}.json`));
}

export function validateBasic(schema, data, path = '$') {
  const errors = [];

  if (schema.type && !matchesType(schema.type, data)) {
    errors.push(`${path}: expected ${schema.type}, got ${inferType(data)}`);
    return errors;
  }

  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path}: expected one of [${schema.enum.join(', ')}], got ${JSON.stringify(data)}`);
    return errors;
  }

  if (schema.type === 'object' && data && typeof data === 'object' && !Array.isArray(data)) {
    const required = schema.required || [];
    for (const key of required) {
      if (!(key in data)) {
        errors.push(`${path}.${key}: missing required field`);
      }
    }

    const properties = schema.properties || {};
    for (const [key, propSchema] of Object.entries(properties)) {
      if (key in data) {
        errors.push(...validateBasic(propSchema, data[key], `${path}.${key}`));
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(data) && schema.items) {
    data.forEach((item, i) => {
      errors.push(...validateBasic(schema.items, item, `${path}[${i}]`));
    });
  }

  return errors;
}

function matchesType(type, value) {
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'number') return typeof value === 'number';
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'null') return value === null;
  return true;
}

function inferType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

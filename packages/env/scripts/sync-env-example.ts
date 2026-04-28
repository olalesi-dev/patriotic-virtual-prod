import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EnvSchema } from '../src/index.js';

const rootDir = join(import.meta.dir, '../../..');
const envExamplePath = join(rootDir, '.env.example');

const {properties} = EnvSchema;
const keys = Object.keys(properties);

const content = keys.map((key) => `${key}=`).join('\n');
writeFileSync(envExamplePath, `${content  }\n`);
console.log(`✅ Synced .env.example with ${keys.length} variables.`);

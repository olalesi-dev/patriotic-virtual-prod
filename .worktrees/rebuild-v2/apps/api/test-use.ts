import { Elysia } from 'elysia';
import { logger } from '@bogeychan/elysia-logger';
import { requestID } from 'elysia-requestid';
import { ip } from 'elysia-ip';
import { helmet } from 'elysia-helmet';
import { rateLimit } from 'elysia-rate-limit';
import compress from 'elysia-compress';
import { elysiaXSS as xss } from 'elysia-xss';
import { loggerConfig } from './src/utils/logger';

console.log('Testing logger');
new Elysia().use(logger(loggerConfig));

console.log('Testing requestID');
new Elysia().use(requestID());

console.log('Testing ip');
new Elysia().use(ip());

console.log('Testing helmet');
new Elysia().use(helmet());

console.log('Testing rateLimit');
new Elysia().use(rateLimit());

console.log('Testing compress');
new Elysia().use(compress());

console.log('Testing xss');
new Elysia().use(xss());

console.log('All OK');

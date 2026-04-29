import { Elysia, t } from 'elysia';
import { rateLimit } from 'elysia-rate-limit';
import { authMacro } from '../auth/macro';
import { AiAssistService } from './ai-assist.service';
import { AiQueueService } from './ai-queue.service';

const assistService = new AiAssistService();
const queueService = new AiQueueService();

export const aiController = new Elysia({ prefix: '/ai' })
  .use(rateLimit({
    max: 10,
    duration: 60000,
    errorResponse: new Response(JSON.stringify({ error: 'AI rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    })
  }))
  .use(authMacro)
  .group('/queue', { isSignIn: true }, (app) =>
    app
      .get('/', async ({ user }) => {
        return await queueService.getQueue(user.organizationId!);
      }, {
        requirePermissions: ['patients:read'],
        detail: { summary: 'Get AI Action Queue', tags: ['AI'] }
      })
      .post('/:id/resolve', async ({ params: { id }, user }) => {
        return await queueService.resolveItem(id, user.organizationId!);
      }, {
        requirePermissions: ['patients:write'],
        params: t.Object({ id: t.String() }),
        detail: { summary: 'Resolve AI Action Item', tags: ['AI'] }
      })
  )
  .post('/assist', async ({ body }) => {
    const { action, text, instruction } = body;
    
    if (action === 'autocomplete') {
      const reply = await assistService.autocomplete(text);
      return { reply };
    } else if (action === 'rewrite') {
      const reply = await assistService.rewrite(text, instruction!);
      return { reply };
    }
  }, {
    isSignIn: true,
    body: t.Object({
      action: t.Union([t.Literal('autocomplete'), t.Literal('rewrite')]),
      text: t.String(),
      instruction: t.Optional(t.String()),
    }),
    detail: { summary: 'AI Writing Assistant', tags: ['AI'] }
  });

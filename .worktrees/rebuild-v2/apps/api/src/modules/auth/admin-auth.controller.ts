/* eslint-disable new-cap */
import { Elysia, t } from 'elysia';
import { and, desc, eq, sql } from 'drizzle-orm';
import { revokeUserAuth } from '@workspace/auth/session-security';
import * as authSchema from '@workspace/db/auth-schema';
import * as schema from '@workspace/db/schema';
import { sendPlainEmail } from '@workspace/email/send-plain-email';
import { env } from '@workspace/env';
import { db } from '../../db';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../utils/errors';
import { authMacro } from './macro';
import { logAuthSecurityEvent } from './security-audit';
import { verifyPasswordForStepUp } from './step-up';
import {
  ADMIN_MFA_BACKUP_CODE_COUNT,
  ADMIN_TRUST_DEVICE_SECONDS,
  assertPendingResetRequest,
  buildAdminDefaultPasswordEmail,
  buildAdminResetApprovedEmail,
  createTemporaryPassword,
  hashAdminPassword,
  isSuperAdminRole,
  normalizeAdminEmail,
  normalizeAdminRole,
} from './admin-auth.service';

const ErrorResponse = t.Object({
  code: t.Number(),
  error: t.String(),
  success: t.Boolean(),
});

const DeliveryResponse = t.Object({
  emailSent: t.Boolean(),
  providerMessageId: t.Optional(t.String()),
  responseCode: t.Optional(t.String()),
});

const AdminUserResponse = t.Object({
  id: t.String(),
  email: t.String(),
  name: t.String(),
  role: t.Union([t.Literal('Admin'), t.Literal('SuperAdmin')]),
  mustChangePassword: t.Boolean(),
  mfaRequired: t.Boolean(),
});

const ResetRequestResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  email: t.String(),
  status: t.String(),
  requestedIpAddress: t.String(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const adminAuthErrorResponses = {
  400: ErrorResponse,
  500: ErrorResponse,
};

const safeUserAgent = (request: Request) =>
  request.headers.get('user-agent') ?? undefined;

const requestIpAddress = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const forwardedIp = forwardedFor?.split(',')[0]?.trim();

  return (
    request.headers.get('cf-connecting-ip') ??
    forwardedIp ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
};

const requireSuperAdmin = (role?: string | null) => {
  if (!isSuperAdminRole(role)) {
    throw new ForbiddenException('Super-admin access required');
  }
};

const findAdminRole = async (roleName: 'Admin' | 'SuperAdmin') => {
  const [role] = await db
    .select({ id: schema.roles.id, name: schema.roles.name })
    .from(schema.roles)
    .where(eq(schema.roles.name, roleName))
    .limit(1);

  if (!role) {
    throw new BadRequestException(`${roleName} role is not configured`);
  }

  return role;
};

const findAdminUserByEmail = async (email: string) => {
  const [target] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      organizationId: schema.users.organizationId,
      role: schema.roles.name,
      disabled: schema.users.disabled,
      mustChangePassword: schema.users.mustChangePassword,
      twoFactorEnabled: schema.users.twoFactorEnabled,
    })
    .from(schema.users)
    .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(eq(schema.users.email, email))
    .limit(1);

  return target;
};

export const adminAuthController = new Elysia({
  name: 'auth.admin.controller',
  prefix: '/auth/admin',
})
  .use(authMacro)
  .get(
    '/session/requirements',
    async ({ session }) => {
      const [target] = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          role: schema.roles.name,
          mustChangePassword: schema.users.mustChangePassword,
          twoFactorEnabled: schema.users.twoFactorEnabled,
        })
        .from(schema.users)
        .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
        .where(eq(schema.users.id, session.userId))
        .limit(1);

      if (!target) {
        throw new NotFoundException('User not found');
      }

      const [factor] = await db
        .select({
          id: authSchema.twoFactors.id,
          verified: authSchema.twoFactors.verified,
          backupCodes: authSchema.twoFactors.backupCodes,
        })
        .from(authSchema.twoFactors)
        .where(eq(authSchema.twoFactors.userId, session.userId))
        .limit(1);

      const mfaVerified = target.twoFactorEnabled && factor?.verified === true;
      const mfaRequired = normalizeAdminRole(target.role ?? '') !== undefined;

      return {
        userId: target.id,
        email: target.email,
        role: target.role,
        mustChangePassword: target.mustChangePassword,
        mfaRequired,
        mfaVerified,
        dashboardAccessAllowed:
          !target.mustChangePassword && (!mfaRequired || mfaVerified),
        totp: {
          enrolled: Boolean(factor?.id),
          verified: factor?.verified === true,
          setupEndpoint: '/api/auth/two-factor/enable',
          qrEndpoint: '/api/auth/two-factor/get-totp-uri',
          verifyEndpoint: '/api/auth/two-factor/verify-totp',
        },
        backupCodes: {
          requiredCount: ADMIN_MFA_BACKUP_CODE_COUNT,
          generated: Boolean(factor?.backupCodes && factor.verified),
          generateEndpoint: '/api/auth/two-factor/generate-backup-codes',
          verifyEndpoint: '/api/auth/two-factor/verify-backup-code',
        },
        trustedDevice: {
          allowed: true,
          maxAgeSeconds: ADMIN_TRUST_DEVICE_SECONDS,
          verifyBodyField: 'trustDevice',
        },
      };
    },
    {
      isSignIn: true,
      detail: {
        summary: 'Get admin authentication requirements',
        description:
          'Returns password-change, MFA, TOTP, backup-code, and trusted-device requirements before dashboard access.',
        tags: ['Auth'],
      },
      response: {
        200: t.Object({
          userId: t.String(),
          email: t.String(),
          role: t.Nullable(t.String()),
          mustChangePassword: t.Boolean(),
          mfaRequired: t.Boolean(),
          mfaVerified: t.Boolean(),
          dashboardAccessAllowed: t.Boolean(),
          totp: t.Object({
            enrolled: t.Boolean(),
            verified: t.Boolean(),
            setupEndpoint: t.String(),
            qrEndpoint: t.String(),
            verifyEndpoint: t.String(),
          }),
          backupCodes: t.Object({
            requiredCount: t.Number(),
            generated: t.Boolean(),
            generateEndpoint: t.String(),
            verifyEndpoint: t.String(),
          }),
          trustedDevice: t.Object({
            allowed: t.Boolean(),
            maxAgeSeconds: t.Number(),
            verifyBodyField: t.String(),
          }),
        }),
        ...adminAuthErrorResponses,
      },
    },
  )
  .post(
    '/users',
    async ({ body, user, session, request, ip, set }) => {
      requireSuperAdmin(session.role);

      const roleName = normalizeAdminRole(body.role);
      if (!roleName) {
        throw new BadRequestException(
          'Only admin or super-admin roles are allowed',
        );
      }

      const email = normalizeAdminEmail(body.email);
      const existing = await findAdminUserByEmail(email);
      if (existing) {
        throw new ConflictException('User already exists');
      }

      const role = await findAdminRole(roleName);
      const temporaryPassword = createTemporaryPassword();
      const passwordHash = await hashAdminPassword(temporaryPassword);
      const now = new Date();

      const created = await db.transaction(async (tx) => {
        const [createdUser] = await tx
          .insert(schema.users)
          .values({
            email,
            name: body.name,
            emailVerified: true,
            roleId: role.id,
            organizationId: user.organizationId!,
            mustChangePassword: true,
            adminCreatedById: user.id,
            updatedAt: now,
          })
          .returning({
            id: schema.users.id,
            email: schema.users.email,
            name: schema.users.name,
            mustChangePassword: schema.users.mustChangePassword,
          });

        await tx.insert(authSchema.accounts).values({
          id: schema.generateId(),
          accountId: createdUser.id,
          providerId: 'credential',
          userId: createdUser.id,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        });

        return createdUser;
      });

      const delivery = await sendPlainEmail(
        buildAdminDefaultPasswordEmail({
          appUrl: env.APP_URL,
          email,
          name: body.name,
          temporaryPassword,
        }),
      );

      await logAuthSecurityEvent({
        actor: user,
        actorRole: session.role,
        targetUserId: created.id,
        event: 'manual_admin_action',
        request,
        ipAddress: ip,
        details: {
          securityAction: 'admin_user_created',
          role: roleName,
          defaultPasswordEmailSent: true,
          providerMessageId: delivery.providerMessageId,
          responseCode: delivery.responseCode,
        },
      });

      set.status = 201;
      return {
        success: true,
        user: {
          id: created.id,
          email: created.email,
          name: created.name,
          role: roleName,
          mustChangePassword: created.mustChangePassword,
          mfaRequired: true,
        },
        delivery: {
          emailSent: true,
          providerMessageId: delivery.providerMessageId,
          responseCode: delivery.responseCode,
        },
      };
    },
    {
      isSignIn: true,
      requireStepUp: true,
      body: t.Object({
        email: t.String({ format: 'email' }),
        name: t.String({ minLength: 1 }),
        role: t.Union([
          t.Literal('admin'),
          t.Literal('super-admin'),
          t.Literal('superadmin'),
          t.Literal('Admin'),
          t.Literal('SuperAdmin'),
        ]),
      }),
      detail: {
        summary: 'Create admin user with temporary password',
        description:
          'Super-admin only. Creates an admin or super-admin account, emails a temporary password, and forces password change plus MFA before dashboard access.',
        tags: ['Auth'],
      },
      response: {
        201: t.Object({
          success: t.Boolean(),
          user: AdminUserResponse,
          delivery: DeliveryResponse,
        }),
        ...adminAuthErrorResponses,
      },
    },
  )
  .post(
    '/first-password',
    async ({ body, user, session, request, ip }) => {
      const verified = await verifyPasswordForStepUp(
        db as never,
        session.userId,
        body.currentPassword,
      );

      if (!verified) {
        throw new ForbiddenException('Current password is invalid');
      }

      if (body.currentPassword === body.newPassword) {
        throw new BadRequestException('New password must be different');
      }

      const [target] = await db
        .select({ mustChangePassword: schema.users.mustChangePassword })
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .limit(1);

      if (!target?.mustChangePassword) {
        throw new BadRequestException('Password change is not required');
      }

      const now = new Date();
      const passwordHash = await hashAdminPassword(body.newPassword);

      const [updatedAccount] = await db
        .update(authSchema.accounts)
        .set({ password: passwordHash, updatedAt: now })
        .where(
          and(
            eq(authSchema.accounts.userId, session.userId),
            eq(authSchema.accounts.providerId, 'credential'),
          ),
        )
        .returning({ id: authSchema.accounts.id });

      if (!updatedAccount) {
        throw new BadRequestException('Credential account is not configured');
      }

      await db
        .update(schema.users)
        .set({
          mustChangePassword: false,
          passwordChangedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.users.id, session.userId));

      const revocation = await revokeUserAuth(
        db as never,
        session.userId,
        'password_change',
        { exceptSessionId: session.id },
      );
      if (revocation.tokenVersion !== null) {
        await db
          .update(authSchema.sessions)
          .set({ tokenVersion: revocation.tokenVersion, updatedAt: now })
          .where(eq(authSchema.sessions.id, session.id));
      }

      await logAuthSecurityEvent({
        actor: user,
        actorRole: session.role,
        targetUserId: session.userId,
        event: 'password_change',
        request,
        ipAddress: ip,
        details: {
          securityAction: 'admin_first_password_change',
          tokenVersion: revocation.tokenVersion,
        },
      });

      return {
        success: true,
        mustChangePassword: false,
        mfaRequired: true,
        next: 'mfa_required',
      };
    },
    {
      isSignIn: true,
      body: t.Object({
        currentPassword: t.String({ minLength: 1 }),
        newPassword: t.String({ minLength: 12 }),
      }),
      detail: {
        summary: 'Change initial admin temporary password',
        description:
          'Signed-in onboarding route. Allows an admin created with a temporary password to set a new password before MFA and dashboard access.',
        tags: ['Auth'],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          mustChangePassword: t.Boolean(),
          mfaRequired: t.Boolean(),
          next: t.Literal('mfa_required'),
        }),
        ...adminAuthErrorResponses,
      },
    },
  )
  .post(
    '/password-reset/requests',
    async ({ body, request, set }) => {
      const email = normalizeAdminEmail(body.email);
      const target = await findAdminUserByEmail(email);
      const requestIp = requestIpAddress(request);

      if (
        target &&
        normalizeAdminRole(target.role ?? '') &&
        !target.disabled &&
        target.organizationId
      ) {
        const [existingPending] = await db
          .select({ id: schema.adminPasswordResetRequests.id })
          .from(schema.adminPasswordResetRequests)
          .where(
            and(
              eq(schema.adminPasswordResetRequests.userId, target.id),
              eq(schema.adminPasswordResetRequests.status, 'pending'),
            ),
          )
          .limit(1);

        let resetRequestId = existingPending?.id;
        let createdNewResetRequest = false;
        if (!existingPending) {
          const [createdResetRequest] = await db
            .insert(schema.adminPasswordResetRequests)
            .values({
              userId: target.id,
              organizationId: target.organizationId,
              requestedEmail: email,
              requestedIpAddress: requestIp,
              requestedUserAgent: safeUserAgent(request),
              reason: body.reason,
            })
            .returning({ id: schema.adminPasswordResetRequests.id });
          resetRequestId = createdResetRequest?.id;
          createdNewResetRequest = true;
        }

        await logAuthSecurityEvent({
          actor: {
            id: target.id,
            email: target.email,
            name: target.name,
            role: target.role,
            organizationId: target.organizationId,
          },
          actorRole: target.role,
          targetUserId: target.id,
          event: 'manual_admin_action',
          request,
          ipAddress: requestIp,
          organizationId: target.organizationId,
          details: {
            securityAction: 'admin_password_reset_requested',
            resetRequestId,
            createdNewResetRequest,
            requestSource: 'unauthenticated_forgot_password',
          },
        });
      }

      set.status = 201;
      return {
        success: true,
        status: 'pending_review',
        message:
          'If this admin account exists, a super-admin will review the reset request.',
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        reason: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Request admin password reset approval',
        description:
          'Public forgot-password intake. It does not email a reset password until a super-admin approves the request.',
        tags: ['Auth'],
      },
      response: {
        201: t.Object({
          success: t.Boolean(),
          status: t.Literal('pending_review'),
          message: t.String(),
        }),
        ...adminAuthErrorResponses,
      },
    },
  )
  .get(
    '/password-reset/requests',
    async ({ query, user, session }) => {
      requireSuperAdmin(session.role);
      const status = query.status ?? 'pending';

      return db
        .select({
          id: schema.adminPasswordResetRequests.id,
          userId: schema.adminPasswordResetRequests.userId,
          email: schema.adminPasswordResetRequests.requestedEmail,
          status: schema.adminPasswordResetRequests.status,
          requestedIpAddress:
            schema.adminPasswordResetRequests.requestedIpAddress,
          createdAt: schema.adminPasswordResetRequests.createdAt,
          updatedAt: schema.adminPasswordResetRequests.updatedAt,
        })
        .from(schema.adminPasswordResetRequests)
        .where(
          and(
            eq(schema.adminPasswordResetRequests.status, status),
            eq(
              schema.adminPasswordResetRequests.organizationId,
              user.organizationId!,
            ),
          ),
        )
        .orderBy(desc(schema.adminPasswordResetRequests.createdAt))
        .limit(query.limit ?? 50);
    },
    {
      isSignIn: true,
      requireStepUp: true,
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal('pending'),
            t.Literal('approved'),
            t.Literal('rejected'),
          ]),
        ),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        summary: 'List admin password reset requests',
        description:
          'Super-admin review queue for admin forgot-password requests.',
        tags: ['Auth'],
      },
      response: {
        200: t.Array(ResetRequestResponse),
        ...adminAuthErrorResponses,
      },
    },
  )
  .post(
    '/password-reset/requests/:id/approve',
    async ({ params: { id }, body, user, session, request, ip }) => {
      requireSuperAdmin(session.role);

      const [resetRequest] = await db
        .select({
          id: schema.adminPasswordResetRequests.id,
          userId: schema.adminPasswordResetRequests.userId,
          status: schema.adminPasswordResetRequests.status,
          email: schema.adminPasswordResetRequests.requestedEmail,
          organizationId: schema.adminPasswordResetRequests.organizationId,
          userName: schema.users.name,
        })
        .from(schema.adminPasswordResetRequests)
        .innerJoin(
          schema.users,
          eq(schema.adminPasswordResetRequests.userId, schema.users.id),
        )
        .where(
          and(
            eq(schema.adminPasswordResetRequests.id, id),
            eq(
              schema.adminPasswordResetRequests.organizationId,
              user.organizationId!,
            ),
          ),
        )
        .limit(1);

      if (!resetRequest) {
        throw new NotFoundException('Password reset request not found');
      }

      if (!assertPendingResetRequest(resetRequest.status)) {
        throw new BadRequestException(
          'Password reset request has already been reviewed',
        );
      }

      const temporaryPassword = createTemporaryPassword();
      const passwordHash = await hashAdminPassword(temporaryPassword);
      const now = new Date();

      const [updatedAccount] = await db
        .update(authSchema.accounts)
        .set({ password: passwordHash, updatedAt: now })
        .where(
          and(
            eq(authSchema.accounts.userId, resetRequest.userId),
            eq(authSchema.accounts.providerId, 'credential'),
          ),
        )
        .returning({ id: authSchema.accounts.id });

      if (!updatedAccount) {
        throw new BadRequestException('Credential account is not configured');
      }

      await db
        .update(schema.users)
        .set({
          mustChangePassword: true,
          passwordChangedAt: sql`NULL`,
          updatedAt: now,
        })
        .where(eq(schema.users.id, resetRequest.userId));

      const revocation = await revokeUserAuth(
        db as never,
        resetRequest.userId,
        'password_reset',
      );

      const delivery = await sendPlainEmail(
        buildAdminResetApprovedEmail({
          appUrl: env.APP_URL,
          email: resetRequest.email,
          name: resetRequest.userName,
          temporaryPassword,
        }),
      );

      await db
        .update(schema.adminPasswordResetRequests)
        .set({
          status: 'approved',
          approvedById: user.id,
          approvedAt: now,
          deliveredAt: now,
          decisionReason: body.decisionReason,
          updatedAt: now,
        })
        .where(eq(schema.adminPasswordResetRequests.id, id));

      await logAuthSecurityEvent({
        actor: user,
        actorRole: session.role,
        targetUserId: resetRequest.userId,
        event: 'password_reset',
        request,
        ipAddress: ip,
        organizationId: resetRequest.organizationId,
        details: {
          securityAction: 'admin_password_reset_approved',
          resetRequestId: resetRequest.id,
          tokenVersion: revocation.tokenVersion,
          providerMessageId: delivery.providerMessageId,
          responseCode: delivery.responseCode,
        },
      });

      return {
        success: true,
        status: 'approved',
        delivery: {
          emailSent: true,
          providerMessageId: delivery.providerMessageId,
          responseCode: delivery.responseCode,
        },
      };
    },
    {
      isSignIn: true,
      requireStepUp: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        decisionReason: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Approve admin password reset request',
        description:
          'Super-admin only. Generates a temporary password, emails it to the admin, forces password change, and revokes existing sessions.',
        tags: ['Auth'],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          status: t.Literal('approved'),
          delivery: DeliveryResponse,
        }),
        ...adminAuthErrorResponses,
      },
    },
  )
  .post(
    '/password-reset/requests/:id/reject',
    async ({ params: { id }, body, user, session, request, ip }) => {
      requireSuperAdmin(session.role);

      const [resetRequest] = await db
        .select({
          id: schema.adminPasswordResetRequests.id,
          userId: schema.adminPasswordResetRequests.userId,
          status: schema.adminPasswordResetRequests.status,
          organizationId: schema.adminPasswordResetRequests.organizationId,
        })
        .from(schema.adminPasswordResetRequests)
        .where(
          and(
            eq(schema.adminPasswordResetRequests.id, id),
            eq(
              schema.adminPasswordResetRequests.organizationId,
              user.organizationId!,
            ),
          ),
        )
        .limit(1);

      if (!resetRequest) {
        throw new NotFoundException('Password reset request not found');
      }

      if (!assertPendingResetRequest(resetRequest.status)) {
        throw new BadRequestException(
          'Password reset request has already been reviewed',
        );
      }

      const now = new Date();
      await db
        .update(schema.adminPasswordResetRequests)
        .set({
          status: 'rejected',
          rejectedById: user.id,
          rejectedAt: now,
          decisionReason: body.decisionReason,
          updatedAt: now,
        })
        .where(eq(schema.adminPasswordResetRequests.id, id));

      await logAuthSecurityEvent({
        actor: user,
        actorRole: session.role,
        targetUserId: resetRequest.userId,
        event: 'manual_admin_action',
        request,
        ipAddress: ip,
        organizationId: resetRequest.organizationId,
        details: {
          securityAction: 'admin_password_reset_rejected',
          resetRequestId: resetRequest.id,
        },
      });

      return {
        success: true,
        status: 'rejected',
      };
    },
    {
      isSignIn: true,
      requireStepUp: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        decisionReason: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Reject admin password reset request',
        description:
          'Super-admin only. Rejects a pending admin forgot-password request without sending a password email.',
        tags: ['Auth'],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          status: t.Literal('rejected'),
        }),
        ...adminAuthErrorResponses,
      },
    },
  );

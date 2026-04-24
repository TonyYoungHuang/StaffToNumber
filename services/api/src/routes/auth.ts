import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { createSalt, createToken, hashPassword, verifyPassword } from "../lib/auth.js";
import { buildPasswordResetEmail, sendTransactionalEmail } from "../lib/email.js";
import {
  completePasswordReset,
  createPasswordResetToken,
  createSession,
  createUser,
  findActivePasswordResetToken,
  findUserByEmail,
  getUserProfile,
  revokeSession,
} from "../repositories/auth-repository.js";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validateCredentials(email: unknown, password: unknown) {
  if (typeof email !== "string" || typeof password !== "string") {
    return "Email and password are required.";
  }

  if (!email.includes("@")) {
    return "Please enter a valid email address.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const body = (request.body ?? {}) as { email?: string; password?: string };
    const validationError = validateCredentials(body.email, body.password);

    if (validationError) {
      return reply.code(400).send({ error: validationError });
    }

    const email = normalizeEmail(body.email!);
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return reply.code(409).send({ error: "Email already registered." });
    }

    const salt = createSalt();
    const passwordHash = hashPassword(body.password!, salt);
    const user = createUser(email, passwordHash, salt);
    const token = createToken();
    createSession(user!.id, token, config.sessionDays);

    return reply.code(201).send({
      token,
      user: getUserProfile(user!.id),
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const body = (request.body ?? {}) as { email?: string; password?: string };
    const validationError = validateCredentials(body.email, body.password);

    if (validationError) {
      return reply.code(400).send({ error: validationError });
    }

    const email = normalizeEmail(body.email!);
    const user = findUserByEmail(email);

    if (!user || !verifyPassword(body.password!, user.password_salt, user.password_hash)) {
      return reply.code(401).send({ error: "Invalid email or password." });
    }

    const token = createToken();
    createSession(user.id, token, config.sessionDays);

    return reply.send({
      token,
      user: getUserProfile(user.id),
    });
  });

  app.get(
    "/auth/me",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      if (!request.authUserId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      return reply.send({
        user: getUserProfile(request.authUserId),
      });
    },
  );

  app.post(
    "/auth/logout",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      if (request.sessionToken) {
        revokeSession(request.sessionToken);
      }

      return reply.send({ ok: true });
    },
  );

  app.post("/auth/forgot-password", async (request, reply) => {
    const body = (request.body ?? {}) as { email?: string; locale?: string };

    if (typeof body.email !== "string" || !body.email.includes("@")) {
      return reply.code(400).send({ error: "Please enter a valid email address." });
    }

    const email = normalizeEmail(body.email);
    const user = findUserByEmail(email);

    if (user) {
      const expiresAt = new Date(Date.now() + config.passwordResetTokenHours * 60 * 60 * 1000).toISOString();
      const resetToken = createPasswordResetToken({
        userId: user.id,
        requestedEmail: email,
        expiresAt,
      });

      if (resetToken) {
        const resetUrl = `${config.resetPasswordUrlBase}?token=${encodeURIComponent(resetToken.token)}`;
        const emailContent = buildPasswordResetEmail({
          email,
          locale: body.locale ?? null,
          resetUrl,
          expiresHours: config.passwordResetTokenHours,
        });

        try {
          await sendTransactionalEmail({
            to: email,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html,
          });
        } catch (error) {
          app.log.error(error);
        }
      }
    }

    return reply.send({
      ok: true,
      message: "If that account exists, a password reset email has been prepared.",
    });
  });

  app.get("/auth/reset-password/verify", async (request, reply) => {
    const query = (request.query ?? {}) as { token?: string };

    if (!query.token) {
      return reply.code(400).send({ error: "Reset token is required." });
    }

    return reply.send({
      valid: Boolean(findActivePasswordResetToken(query.token)),
    });
  });

  app.post("/auth/reset-password", async (request, reply) => {
    const body = (request.body ?? {}) as { token?: string; password?: string };

    if (typeof body.token !== "string" || !body.token.trim()) {
      return reply.code(400).send({ error: "Reset token is required." });
    }

    if (typeof body.password !== "string" || body.password.length < 8) {
      return reply.code(400).send({ error: "Password must be at least 8 characters." });
    }

    const resetToken = findActivePasswordResetToken(body.token.trim());
    if (!resetToken) {
      return reply.code(400).send({ error: "This password reset link is invalid or expired." });
    }

    const salt = createSalt();
    const passwordHash = hashPassword(body.password, salt);

    completePasswordReset({
      tokenId: resetToken.id,
      userId: resetToken.user_id,
      passwordHash,
      passwordSalt: salt,
    });

    return reply.send({ ok: true });
  });
}

import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { createSalt, createToken, hashPassword, verifyPassword } from "../lib/auth.js";
import {
  createSession,
  createUser,
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
}

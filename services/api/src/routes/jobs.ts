import type { ConversionDirection } from "@score/shared";
import type { FastifyInstance } from "fastify";
import { getUserProfile } from "../repositories/auth-repository.js";
import { findStoredFileById } from "../repositories/file-repository.js";
import { createJob, findJobById, listJobsByUserId, mapJobForApi } from "../repositories/job-repository.js";

function isDirection(value: unknown): value is ConversionDirection {
  return value === "staff_pdf_to_numbered" || value === "numbered_pdf_to_staff";
}

export async function jobRoutes(app: FastifyInstance) {
  app.get(
    "/jobs",
    {
      preHandler: app.requireAuth,
    },
    async (request) => {
      return {
        jobs: listJobsByUserId(request.authUserId!).map(mapJobForApi),
      };
    },
  );

  app.get(
    "/jobs/:id",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const job = findJobById(params.id);

      if (!job || job.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Job not found." });
      }

      return reply.send({ job: mapJobForApi(job) });
    },
  );

  app.post(
    "/jobs",
    {
      preHandler: app.requireAuth,
    },
    async (request, reply) => {
      const profile = getUserProfile(request.authUserId!);
      if (!profile || profile.entitlement.status !== "active") {
        return reply.code(403).send({ error: "An active entitlement is required to create jobs." });
      }

      const body = (request.body ?? {}) as { inputFileId?: string; direction?: ConversionDirection };
      if (!body.inputFileId || !isDirection(body.direction)) {
        return reply.code(400).send({ error: "inputFileId and direction are required." });
      }

      const inputFile = findStoredFileById(body.inputFileId);
      if (!inputFile || inputFile.user_id !== request.authUserId) {
        return reply.code(404).send({ error: "Input file not found." });
      }

      const job = createJob({
        userId: request.authUserId!,
        inputFileId: body.inputFileId,
        direction: body.direction,
      });

      return reply.code(201).send({ job: mapJobForApi(job!) });
    },
  );
}

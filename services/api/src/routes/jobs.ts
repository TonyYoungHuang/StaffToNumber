import type { ConversionDirection } from "@score/shared";
import type { FastifyInstance } from "fastify";
import { findStoredFileById } from "../repositories/file-repository.js";
import { createJob, findJobById, listJobsByUserId, mapJobForApi } from "../repositories/job-repository.js";

function isDirection(value: unknown): value is ConversionDirection {
  return value === "staff_pdf_to_numbered";
}

export async function jobRoutes(app: FastifyInstance) {
  app.get(
    "/jobs",
    {
      preHandler: app.requireActiveEntitlement,
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
      preHandler: app.requireActiveEntitlement,
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
      preHandler: app.requireActiveEntitlement,
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { inputFileId?: string; direction?: ConversionDirection };
      if (!body.inputFileId || !isDirection(body.direction)) {
        return reply.code(400).send({ error: "Only staff PDF to numbered notation is currently supported." });
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

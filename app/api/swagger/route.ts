import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/swagger:
 *   get:
 *     summary: OpenAPI spec
 *     tags:
 *       - Meta
 */
export function GET() {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "Spark-Hire AROE API",
      version: "1.0.0",
      description:
        "Automated Recruitment Orchestration Engine — submit candidates, trigger evaluations, and manage the priority queue.",
    },
    tags: [
      { name: "Candidates", description: "Candidate ingestion and listing" },
      { name: "JobListings", description: "Job listing management" },
      { name: "Recruiter", description: "Protected recruiter dashboard endpoints" },
      { name: "Meta", description: "API meta endpoints" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "authjs.session-token",
        },
      },
    },
    paths: {
      "/api/candidates": {
        post: {
          summary: "Submit a new candidate application",
          description:
            "Accepts a multipart form with name, email, and resume PDF. Creates a candidate record and triggers the evaluation pipeline asynchronously.",
          tags: ["Candidates"],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["name", "email", "resume"],
                  properties: {
                    name: { type: "string", example: "Jane Doe" },
                    email: {
                      type: "string",
                      format: "email",
                      example: "jane@example.com",
                    },
                    resume: { type: "string", format: "binary" },
                    jobListingId: {
                      type: "string",
                      description: "Optional job listing ID to associate this application with",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Candidate created — pipeline started",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      email: { type: "string" },
                      status: { type: "string", enum: ["APPLIED"] },
                    },
                  },
                },
              },
            },
            "400": { description: "Validation error or missing PDF" },
            "409": { description: "Email already registered" },
            "500": { description: "Internal server error" },
          },
        },
        get: {
          summary: "List all candidates (debug)",
          tags: ["Candidates"],
          responses: {
            "200": {
              description: "Array of all candidates",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        email: { type: "string" },
                        status: {
                          type: "string",
                          enum: [
                            "APPLIED",
                            "PENDING_Q1",
                            "PENDING_Q2",
                            "SCORED",
                            "PRIORITY_QUEUE",
                            "REJECTED",
                            "HUMAN_REVIEWED",
                          ],
                        },
                        scoreQ1: { type: "number", nullable: true },
                        scoreQ2: { type: "number", nullable: true },
                        scoreTotal: { type: "number", nullable: true },
                        appliedAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/job-listings": {
        get: {
          summary: "List active job listings",
          tags: ["JobListings"],
          responses: {
            "200": {
              description: "Array of active job listings",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        location: { type: "string", nullable: true },
                        isActive: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create a new job listing",
          tags: ["JobListings"],
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "description"],
                  properties: {
                    title: { type: "string", example: "Senior Backend Engineer" },
                    description: { type: "string" },
                    location: { type: "string", example: "Remote" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Job listing created" },
            "400": { description: "Validation error" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/job-listings/{id}": {
        patch: {
          summary: "Toggle a job listing active/inactive",
          tags: ["JobListings"],
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["isActive"],
                  properties: { isActive: { type: "boolean" } },
                },
              },
            },
          },
          responses: {
            "200": { description: "Updated job listing" },
            "401": { description: "Unauthorized" },
          },
        },
        delete: {
          summary: "Delete a job listing",
          tags: ["JobListings"],
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Deleted successfully" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/recruiter/queue": {
        get: {
          summary: "Get the priority candidate queue",
          description:
            "Returns candidates with PRIORITY_QUEUE status. Sorted by score (desc) then by application date (asc). Requires authentication.",
          tags: ["Recruiter"],
          security: [{ cookieAuth: [] }],
          responses: {
            "200": {
              description: "Priority queue candidates",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        email: { type: "string" },
                        scoreQ1: { type: "number" },
                        scoreQ2: { type: "number" },
                        scoreTotal: { type: "number" },
                        resumePath: { type: "string" },
                        appliedAt: { type: "string", format: "date-time" },
                        status: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/recruiter/review/{id}": {
        patch: {
          summary: "Finalise a hire or reject decision",
          description:
            "Records a recruiter's final decision on a priority-queue candidate. Requires authentication.",
          tags: ["Recruiter"],
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
              description: "Candidate ID",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["decision"],
                  properties: {
                    decision: { type: "string", enum: ["HIRE", "REJECT"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Decision recorded",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      status: { type: "string" },
                      decision: { type: "string" },
                    },
                  },
                },
              },
            },
            "400": { description: "Validation error" },
            "401": { description: "Unauthorized" },
            "404": { description: "Candidate not found" },
          },
        },
      },
    },
  };

  return NextResponse.json(spec);
}

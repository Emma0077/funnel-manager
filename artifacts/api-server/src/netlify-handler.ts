import serverless from "serverless-http";
import app from "./app";

export const config = {
  path: "/api/*",
};

export const handler = serverless(app);

const express = require("express");
const cors = require("cors");
const { Server } = require("@tus/server");
const { FileStore } = require("@tus/file-store");
const { S3Store } = require("@tus/s3-store");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: "*",
  })
);

const s3Store = new S3Store({
  partSize: 2 * 1024 * 1024, // Each uploaded part will have ~8MiB,
  maxConcurrentPartUploads: 10,
  s3ClientConfig: {
    bucket: process.env.AWS_BUCKET,
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },
});

const uploadApp = express();
const server = new Server({
  path: "/uploads",
  datastore: s3Store,

  namingFunction(req, metadata) {
    return `test/${metadata.filename}`;
  },
  generateUrl(req, { proto, host, path, id }) {
    id = Buffer.from(id, "utf-8").toString("base64url");
    return `${proto}://${host}${path}/${id}`;
  },
  getFileIdFromRequest(req, lastPath) {
    // lastPath is everything after the last `/`
    // If your custom URL is different, this might be undefined
    // and you need to extract the ID yourself
    return Buffer.from(lastPath, "base64url").toString("utf-8");
  },
  onUploadFinish(req, res, upload) {
    // Return the custom response with the upload data
    return {
      res,
      status_code: 200, // Custom response code, 204 is default
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(upload),
    };
  },
  onResponseError(req, res, error) {
    console.log(error);
  },
});

uploadApp.all("*", server.handle.bind(server));
app.use("/uploads", uploadApp);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

import express, { Request, Response, Application } from "express";
import fetch from "node-fetch";
import cors from "cors";
import { main } from "./simple-zkapp-berkeley";

const dotenv = require("dotenv");

// For env File
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Express & TypeScript Server");
});

app.post("/", async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    await main();

    res.send("Successfully sent").status(200);
  } catch (e: any) {
    console.error(e.message);
    res.send(e.message).status(500);
  }
});

app.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`);
});

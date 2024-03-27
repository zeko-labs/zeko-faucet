import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, Application } from "express";
import cors from "cors";
import { sendPayment } from "./faucet";

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

    if (!address) {
      throw new Error("Address cannot be null");
    }

    await sendPayment(address);

    res.send("Successfully sent").status(200);
  } catch (e: any) {
    console.error(e);
    res.send("Error occured: " + e.message).status(500);
  }
});

app.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`);
});

import mongoose from "mongoose";
import { z } from "zod";

export const objectIdString = z.string().refine(
    (id) => mongoose.Types.ObjectId.isValid(id),
    { message: "Invalid ObjectId" }
);

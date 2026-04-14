import mongoose, { Model } from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const teamSchema = new mongoose.Schema(
    {
        teamName: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
        teamType: {
            type: String,
            enum: ["personal", "group"],
            default: "group",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

export type ITeam = InferSchemaType<typeof teamSchema>;
export type TeamDocument = HydratedDocument<ITeam>;

const Team: Model<ITeam> = mongoose.model<ITeam>("Team", teamSchema);

export default Team;

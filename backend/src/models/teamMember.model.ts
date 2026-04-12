import mongoose, { Model } from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const teamMemberSchema = new mongoose.Schema(
    {
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Team",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        memberRole: {
            type: String,
            enum: ["owner", "admin", "member"],
            default: "member",
        },
        status: {
            type: String,
            enum: ["pending", "active", "removed"],
            default: "active",
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

teamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

export type ITeamMember = InferSchemaType<typeof teamMemberSchema>;
export type TeamMemberDocument = HydratedDocument<ITeamMember>;

const TeamMember: Model<ITeamMember> = mongoose.model<ITeamMember>(
    "TeamMember",
    teamMemberSchema
);

export default TeamMember;

import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { signUpSchema } from "../schemas/auth.schema";
import { generateToken } from "../lib/utils";
import User from "../models/user.model";


export const signUp = async (req: Request, res: Response) => {
    try {
        const result = signUpSchema.safeParse(req.body);

        if (!result.success) {
            const { fieldErrors } = z.flattenError(result.error);
            return res.status(400).json({
                errors: fieldErrors,
            });
        }

        const { username, email, password } = result.data;

        const user = await User.findOne({email});
        if (user) return res.status(400).json({message: "Email already exists"});

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username: username,
            email: email,
            password: hashedPassword,
        })

        const saveUser = await newUser.save();
        generateToken(saveUser._id.toString(), res);

        return res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            profilePic: newUser.profilePic
        });

    } catch (error) {
        console.error("SignUp controller:", error);
        return res.status(500).json({ message: "Internal Server error" });
    }
};
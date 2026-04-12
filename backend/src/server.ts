import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

import { createApp } from "./app.ts";
import { connectDatabase } from "./lib/database.ts";

dotenv.config();

const app = createApp();
const __dirname = path.resolve();

const port = process.env.PORT || 3001;
const env = process.env.NODE_ENV || 'development';

if (env === 'production') {
    const static_assets = express.static(path.resolve(__dirname, '../frontend/out'));
    app.use(static_assets);

    app.get('/*splat', (_, res) => {
        res.sendFile(path.join(__dirname, '../frontend', 'out', 'index.html'));
    });
}

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
    connectDatabase().then(r => console.log("Server can talk now"));
});

import express from 'express';
import dotenv from 'dotenv';
//
import authRoute from './routes/auth.route.ts';
import messageRoute from './routes/message.route.ts';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use('/api/auth', authRoute);
app.use('/api/messages', messageRoute);

app.listen(port, () => console.log(`Server started on port ${port}`));
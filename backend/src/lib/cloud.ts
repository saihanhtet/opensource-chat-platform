
import dotenv from "dotenv";
import path from "path";
import { v2 as cloud} from "cloudinary";

dotenv.config({ path: path.join(import.meta.dir, "../../.env") });

const cloudName = process.env.CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUD_API ?? process.env.CLOUD_API_KEY ?? process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUD_SECRET ?? process.env.CLOUD_API_SECRET ?? process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
    console.warn(
        "[cloudinary] Missing credentials. Set CLOUD_NAME/CLOUD_API/CLOUD_SECRET (or CLOUDINARY_* equivalents). " +
        "Uploads may fail with unsigned upload errors."
    );
}

cloud.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
})

export default cloud;
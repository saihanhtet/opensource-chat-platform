
import dotenv from "dotenv";
import { v2 as cloud} from "cloudinary";

dotenv.config();

cloud.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API,
    api_secret: process.env.CLOUD_SECRET,
})

export default cloud;
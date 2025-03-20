const multer = require("multer");
const sharp = require("sharp");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");


const s3Client = new S3Client({
  region: process.env.AWS_REGION ,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const storage = multer.memoryStorage();

// (only images)
const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};


const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max 
  },
  fileFilter,
});


const uploadToS3 = async (file, width, height) => {
  try {
    if (!process.env.AWS_S3_BUCKET_NAME) {
      throw new Error("AWS_S3_BUCKET_NAME environment variable is missing");
    }

    if (!process.env.AWS_REGION) {
      throw new Error("AWS_REGION environment variable is missing");
    }

    
    let processedImageBuffer;

    try {
      if (width > 1024 || height > 1024) {
        processedImageBuffer = await sharp(file.buffer)
          .resize({
            width: Math.min(width, 1024),
            height: Math.min(height, 1024),
            fit: "inside",
          })
          .toBuffer();
      } else {
        // If no resizing needed, still process with sharp to validate the image
        processedImageBuffer = await sharp(file.buffer).toBuffer();
      }
    } catch (sharpError) {
      console.error("Error processing image with Sharp:", sharpError);
      throw new Error("Failed to process image: " + sharpError.message);
    }

    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_.]/g, "");
    const filename = `${timestamp}-${sanitizedOriginalName}`;


    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: filename,
      Body: processedImageBuffer || file.buffer, 
      ContentType: file.mimetype,
    //   ACL: "public-read", 
    };

    // Upload to S3
    try {
      const command = new PutObjectCommand(params);
      const uploadResult = await s3Client.send(command);
      // console.log("S3 upload successful:", uploadResult);

     
      return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
    } catch (s3Error) {
      console.error("S3 upload error details:", s3Error);
      throw new Error("Failed to upload to S3: " + s3Error.message);
    }
  } catch (error) {
    console.error("Error in uploadToS3 function:", error);
    throw error; 
  }
};


const processAndUploadImage = async (req, res, next) => {
  // console.log("processAndUploadImage middleware called");

  if (!req.file) {
    console.log("No file found in request");
    return next(); 
  }

  try {
    console.log(
      "Processing file:",
      req.file.originalname,
      "Size:",
      req.file.size
    );

    let metadata;
    try {
      metadata = await sharp(req.file.buffer).metadata();
    } catch (metadataError) {
      console.error("Error getting image metadata:", metadataError);
      return res
        .status(400)
        .json({ error: "Invalid image file: " + metadataError.message });
    }

    const { width, height } = metadata;
    console.log("Image dimensions:", width, "x", height);

  
    const imageUrl = await uploadToS3(req.file, width, height);
    console.log("Image uploaded successfully. URL:", imageUrl);

    req.fileUrl = imageUrl;

    next();
  } catch (error) {
    console.error("Error in processAndUploadImage middleware:", error);
    return res
      .status(500)
      .json({ error: "Error processing image: " + error.message });
  }
};
module.exports = { upload, processAndUploadImage };
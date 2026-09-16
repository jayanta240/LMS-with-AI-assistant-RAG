import cloudinary
import cloudinary.uploader

from config import settings


# ============================================================
# CLOUDINARY CONFIGURATION
# ============================================================

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


# ============================================================
# VIDEO UPLOAD
# ============================================================

def upload_video(file_path: str):
    """
    Upload a video file to Cloudinary.

    Returns:
        {
            "url": "<secure Cloudinary URL>",
            "public_id": "<Cloudinary public ID>"
        }
    """

    try:
        result = cloudinary.uploader.upload(
            file_path,
            resource_type="video",
        )

        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
        }

    except Exception as exc:
        raise RuntimeError(
            f"Cloudinary video upload failed: {exc}"
        ) from exc
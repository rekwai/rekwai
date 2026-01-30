import os
import logging
import asyncio
from io import BytesIO

from minio import Minio
from minio.error import S3Error
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class S3Service:
    """
    Centralized service for handling S3/MinIO operations.
    """

    UPLOAD_DOCUMENTS_BUCKET = "upload-documents"

    def __init__(self):
        self.s3_url = self._get_required_env("S3_URL")
        self.s3_port = self._get_required_env("S3_PORT")
        self.s3_access_key = self._get_required_env("S3_ACCESS_KEY")
        self.s3_secret_key = self._get_required_env("S3_SECRET_KEY")
        self.s3_region = self._get_required_env("S3_REGION")

        # Create MinIO client
        self.client = Minio(
            f"{self.s3_url}:{self.s3_port}",
            access_key=self.s3_access_key,
            secret_key=self.s3_secret_key,
            secure=False,  # Use HTTP for local development
            region=self.s3_region,
        )

    @staticmethod
    def _get_required_env(name: str) -> str:
        """Get a required environment variable or raise an error."""
        value = os.getenv(name)
        if value is None:
            raise RuntimeError(f"Required environment variable '{name}' is not set")
        return value

    async def save_file(
        self, bucket_name: str, object_key: str, file_content: bytes
    ) -> str:
        """
        Save a file to S3.

        Args:
            bucket_name: The S3 bucket name
            object_key: The S3 object key (path)
            file_content: The file content as bytes

        Returns:
            The S3 object key where the file was stored
        """

        try:
            file_stream = BytesIO(file_content)
            await asyncio.to_thread(
                self.client.put_object,
                bucket_name=bucket_name,
                object_name=object_key,
                data=file_stream,
                length=len(file_content),
            )
            logger.info(f"Successfully uploaded file to S3: {object_key}")
            return object_key
        except S3Error as e:
            logger.error(f"Error uploading file to S3: {e}")
            raise HTTPException(status_code=500, detail=f"S3 upload error: {e}")

    async def download_file(self, bucket_name: str, object_key: str) -> bytes:
        """
        Download a file from S3.

        Args:
            bucket_name: The S3 bucket name
            object_key: The S3 object key (path)

        Returns:
            The file content as bytes
        """

        def _download_file():
            response = self.client.get_object(bucket_name, object_key)
            file_content = response.read()
            response.close()
            response.release_conn()
            return file_content

        try:
            file_content = await asyncio.to_thread(_download_file)
            logger.info(f"Successfully downloaded file from S3: {object_key}")
            return file_content
        except S3Error as e:
            logger.error(f"Error downloading file from S3: {e}")
            if e.code == "NoSuchKey":
                raise HTTPException(
                    status_code=404, detail=f"File not found: {object_key}"
                )
            raise HTTPException(status_code=500, detail=f"S3 download error: {e}")

    async def delete_file(self, bucket_name: str, object_key: str) -> bool:
        """
        Delete a file from S3.

        Args:
            bucket_name: The S3 bucket name
            object_key: The S3 object key (path)

        Returns:
            True if successful
        """
        try:
            await asyncio.to_thread(self.client.remove_object, bucket_name, object_key)
            logger.info(f"Successfully deleted file from S3: {object_key}")
            return True
        except S3Error as e:
            logger.error(f"Error deleting file from S3: {e}")
            raise HTTPException(status_code=500, detail=f"S3 delete error: {e}")

    async def file_exists(self, bucket_name: str, object_key: str) -> bool:
        """
        Check if a file exists in S3.

        Args:
            bucket_name: The S3 bucket name
            object_key: The S3 object key (path)

        Returns:
            True if the file exists, False otherwise
        """
        try:
            await asyncio.to_thread(self.client.stat_object, bucket_name, object_key)
            return True
        except S3Error as e:
            if e.code == "NoSuchKey":
                return False
            raise HTTPException(
                status_code=500, detail=f"S3 error checking file existence: {e}"
            )

"""Checks on the images uploaded with an incasso, before they reach the PDF."""

from fastapi import HTTPException, UploadFile, status

__all__ = ["MAX_IMAGES", "MAX_IMAGE_BYTES", "read_images"]

# A round has a handful of receipts and cheques: 30 leaves plenty of room.
MAX_IMAGES = 30
# The same limit the frontend puts on the gallery.
MAX_IMAGE_BYTES = 10 * 1024 * 1024

# The first bytes of each accepted format. The type the client declares is not
# trusted: it ends up in a data URI that WeasyPrint renders, and an SVG could
# make it fetch resources from the network.
_SIGNATURES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
}


def _detect_type(data: bytes) -> str | None:
    """
    Recognise a JPEG or a PNG from its first bytes

    :param data: The content of the file
    :return: The MIME type, or None when it is neither
    """
    for signature, mime_type in _SIGNATURES.items():
        if data.startswith(signature):
            return mime_type
    return None


async def read_images(files: list[UploadFile]) -> list[tuple[str, bytes]]:
    r"""
    Read the uploaded images, refusing anything but a few JPEG and PNG files

    :param files: The files of the request
    :return: The MIME type detected from the content and the bytes of each,
        in the order they were sent, e.g. for a photo and a scan::

            [
                ("image/jpeg", b"\xff\xd8\xff\xe0..."),
                ("image/png", b"\x89PNG\r\n\x1a\n..."),
            ]

    :raises HTTPException: 422 when there are too many files or one is not an
        image, 413 when one is too large
    """
    if len(files) > MAX_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"At most {MAX_IMAGES} images can be sent",
        )

    images = []
    for file in files:
        # One byte more than allowed is enough to tell the file is too large.
        data = await file.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"{file.filename} is larger than 10 MB",
            )
        mime_type = _detect_type(data)
        if mime_type is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"{file.filename} is not a JPEG or PNG image",
            )
        images.append((mime_type, data))
    return images

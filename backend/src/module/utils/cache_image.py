import asyncio
import hashlib


async def save_image(img, suffix):
    img_hash = hashlib.md5(img).hexdigest()[0:8]
    image_path = f"data/posters/{img_hash}.{suffix}"

    def _write():
        with open(image_path, "wb") as f:
            f.write(img)

    await asyncio.to_thread(_write)
    return f"posters/{img_hash}.{suffix}"


async def load_image(img_path):
    if img_path:

        def _read():
            with open(f"data/{img_path}", "rb") as f:
                return f.read()

        return await asyncio.to_thread(_read)
    return None

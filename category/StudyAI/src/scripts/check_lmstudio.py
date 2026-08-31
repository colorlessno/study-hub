import httpx
import asyncio

async def main():
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get("http://host.docker.internal:5858/v1/models")
        print("STATUS:", r.status_code)
        print("BODY:", r.text)

asyncio.run(main())

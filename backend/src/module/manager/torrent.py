from module.database import Database
from module.models import ResponseModel
from module.parser import TitleParser


class TorrentManager(Database):
    async def refresh_poster(self):
        bangumis = await self.bangumi.search_all()
        for bangumi in bangumis:
            if not bangumi.poster_link:
                await TitleParser().tmdb_poster_parser(bangumi)
        await self.bangumi.update_all(bangumis)
        return ResponseModel(
            status_code=200,
            status=True,
            msg_en="Refresh poster link successfully.",
            msg_zh="刷新海报链接成功。",
        )

    async def refind_poster(self, bangumi_id: int):
        bangumi = await self.bangumi.search_id(bangumi_id)
        if bangumi is None:
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find data with {bangumi_id}",
                msg_zh=f"无法找到 id {bangumi_id} 的数据",
            )
        await TitleParser().tmdb_poster_parser(bangumi)
        await self.bangumi.update(bangumi)
        return ResponseModel(
            status_code=200,
            status=True,
            msg_en="Refresh poster link successfully.",
            msg_zh="刷新海报链接成功。",
        )

    async def search_all_bangumi(self):
        datas = await self.bangumi.search_all()
        if not datas:
            return []
        return [data for data in datas if not data.deleted]


if __name__ == "__main__":
    import asyncio

    async def _main():
        async with TorrentManager() as manager:
            await manager.refresh_poster()

    asyncio.run(_main())

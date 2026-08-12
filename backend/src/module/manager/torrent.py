from loguru import logger

from module.database import Database
from module.downloader import DownloadClient
from module.models import Bangumi, BangumiUpdate, ResponseModel
from module.parser import TitleParser


class TorrentManager(Database):
    @staticmethod
    async def __match_torrents_list(data: Bangumi | BangumiUpdate) -> list:
        async with DownloadClient() as client:
            torrents = await client.get_torrent_info(status_filter=None)
        return [
            torrent.hash for torrent in torrents if torrent.save_path == data.save_path
        ]

    async def delete_torrents(self, data: Bangumi, client: DownloadClient):
        hash_list = await self.__match_torrents_list(data)
        if hash_list:
            await client.delete_torrent(hash_list)
            logger.info("Delete rule and torrents for {}", data.official_title)
            return ResponseModel(
                status_code=200,
                status=True,
                msg_en=f"Delete rule and torrents for {data.official_title}",
                msg_zh=f"删除 {data.official_title} 规则和种子",
            )
        else:
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find torrents for {data.official_title}",
                msg_zh=f"无法找到 {data.official_title} 的种子",
            )

    async def delete_rule(self, _id: int | str, file: bool = False):
        data = await self.bangumi.search_id(int(_id))
        if isinstance(data, Bangumi):
            async with DownloadClient() as client:
                rss_links = filter(None, data.rss_link.split(","))
                for rss_link in rss_links:
                    rss = await self.rss.search_url(rss_link)
                    if rss is None or rss.aggregate or rss.id is None:
                        continue
                    await self.rss.delete(rss.id)
                if data.offset != 0:
                    torrents = await self.torrent.search_bangumi(int(_id))
                    hashes = {torrent.hash for torrent in torrents if torrent.hash}
                    await client.set_category(hashes, "BangumiFixed")
                await self.bangumi.delete_one(int(_id))
                await self.torrent.delete_by_bangumi_id(int(_id))
                if file:
                    torrent_message = await self.delete_torrents(data, client)
                logger.info("[Manager] Delete rule for {}", data.official_title)
                return ResponseModel(
                    status_code=200,
                    status=True,
                    msg_en=f"Delete rule for {data.official_title}. {torrent_message.msg_en if file else ''}",
                    msg_zh=f"删除 {data.official_title} 规则。{torrent_message.msg_zh if file else ''}",
                )
        else:
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find id {_id}",
                msg_zh=f"无法找到 id {_id}",
            )

    async def disable_rule(self, _id: str | int, file: bool = False):
        data = await self.bangumi.search_id(int(_id))
        if isinstance(data, Bangumi):
            async with DownloadClient() as client:
                data.deleted = True
                await self.bangumi.update(data)
                if file:
                    torrent_message = await self.delete_torrents(data, client)
                    return torrent_message
                logger.info("[Manager] Disable rule for {}", data.official_title)
                return ResponseModel(
                    status_code=200,
                    status=True,
                    msg_en=f"Disable rule for {data.official_title}",
                    msg_zh=f"禁用 {data.official_title} 规则",
                )
        else:
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find id {_id}",
                msg_zh=f"无法找到 id {_id}",
            )

    async def enable_rule(self, _id: str | int):
        data = await self.bangumi.search_id(int(_id))
        if data:
            data.deleted = False
            await self.bangumi.update(data)
            logger.info("[Manager] Enable rule for {}", data.official_title)
            return ResponseModel(
                status_code=200,
                status=True,
                msg_en=f"Enable rule for {data.official_title}",
                msg_zh=f"启用 {data.official_title} 规则",
            )
        else:
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find id {_id}",
                msg_zh=f"无法找到 id {_id}",
            )

    async def update_rule(self, bangumi_id, data: BangumiUpdate):
        old_data: Bangumi | None = await self.bangumi.search_id(bangumi_id)
        if old_data:
            # Move torrent
            match_list = await self.__match_torrents_list(old_data)
            async with DownloadClient() as client:
                path = client._gen_save_path(data)
                if match_list:
                    await client.move_torrent(match_list, path)
            data.save_path = path
            await self.bangumi.update(data, bangumi_id)
            return ResponseModel(
                status_code=200,
                status=True,
                msg_en=f"Update rule for {data.official_title}",
                msg_zh=f"更新 {data.official_title} 规则",
            )
        else:
            logger.error("[Manager] Can't find data with {}", bangumi_id)
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find data with {bangumi_id}",
                msg_zh=f"无法找到 id {bangumi_id} 的数据",
            )

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

    async def search_one(self, _id: int | str):
        data = await self.bangumi.search_id(int(_id))
        if not data:
            logger.error("[Manager] Can't find data with {}", _id)
            return ResponseModel(
                status_code=406,
                status=False,
                msg_en=f"Can't find data with {_id}",
                msg_zh=f"无法找到 id {_id} 的数据",
            )
        else:
            return data


if __name__ == "__main__":
    import asyncio

    async def _main():
        async with TorrentManager() as manager:
            await manager.refresh_poster()

    asyncio.run(_main())

import json
import logging

from openai import DefaultHttpxClient, OpenAI

from module.conf import settings
from module.models.bangumi import Episode
from module.utils.proxy import build_proxy_url
from module.utils.text import remove_outside_braces

logger = logging.getLogger(__name__)

DEFAULT_PROMPT = """\
## Role

You will now play the role of a super assistant. Your task is to extract structured data from unstructured text content and output it in JSON format.

## Instructions

- Analyze the given text and identify relevant information for each field in the specified data structure.
- If you are unable to extract any information for a field, keep the field in the output and set its value to an empty string (`''`) or `None`.
- Do not fabricate or infer any data! Ensure all fields are included in the output, even if they are empty.

## Data Structure

Use the following Python class as a reference for the structured data format:

```python
class Episode(BaseModel):
    title_en: str | None
    title_zh: str | None
    title_jp: str | None
    season: int
    season_raw: str
    episode: int | float
    sub: str | None
    group: str
    resolution: str | None
    source: str | None
```

## Output Format

The extracted data should be output as a valid JSON string adhering to the specified data structure. Do not include any additional text or formatting beyond the JSON data.

Example 1:
- Input: "【喵萌奶茶屋】★04月新番★[夏日重现/Summer Time Rendering][11][1080p][繁日双语][招募翻译]"
- Output: `{"group": "喵萌奶茶屋", "title_en": "Summer Time Rendering", "resolution": "1080P", "episode": 11, "season": 1, "title_zh": "夏日重现", "sub": "", "title_jp": "", "season_raw": "", "source": ""}`

Example 2:
- Input: "[ANi] 关于我转生变成史莱姆这档事 第三季 - 48.5 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]"
- Output: `{"group": "ANi", "title_en": "", "resolution": "1080P", "episode": 48.5, "season": 3, "source": "Baha", "title_zh": "关于我转生变成史莱姆这档事", "sub": "CHT", "title_jp": "", "season_raw": "第三季"}`

Example 3:
- Input: "【幻樱字幕组】【4月新番】【古见同学有交流障碍症 第二季 Komi-san wa, Komyushou Desu. S02】【22】【GB_MP4】【1920X1080】"
- Output: `{"group": "幻樱字幕组", "title_en": "Komi-san wa, Komyushou Desu.", "resolution": "1920X1080", "episode": 22, "season": 2, "title_zh": "古见同学有交流障碍症", "sub": "", "title_jp": "", "season_raw": "", "source": ""}`

Example 4:
- Input: "[Lilith-Raws] 关于我在无意间被隔壁的天使变成废柴这件事 / Otonari no Tenshi-sama - 09 [Baha][WEB-DL][1080p][AVC AAC][CHT][MP4]"
- Output: `{"group": "Lilith-Raws", "title_en": "Otonari no Tenshi-sama", "resolution": "1080p", "episode": 9, "season": 1, "source": "WEB-DL", "title_zh": "关于我在无意间被隔壁的天使变成废柴这件事", "sub": "CHT", "title_jp": ""}`

Please ensure your output strictly follows the JSON format, without any additional text or formatting. If you cannot extract certain information, set the corresponding field to an empty string or `None`.
"""


class OpenAIParser:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.http_client = (
            DefaultHttpxClient(proxies=build_proxy_url())
            if settings.proxy.enable
            else None
        )

    def __enter__(self) -> "OpenAIParser":
        self.client = OpenAI(
            api_key=self.api_key, base_url=self.base_url, http_client=self.http_client
        )
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        self.client.close()

    def parse(self, text: str) -> Episode:
        chat_completion = self.client.chat.completions.create(
            messages=[
                dict(role="system", content=DEFAULT_PROMPT),
                dict(role="user", content=text),
            ],
            model=self.model,
            temperature=0,
            response_format={"type": "json_object"},
        )
        result = chat_completion.choices[0].message.content
        result = remove_outside_braces(result)
        try:
            episode_data = json.loads(result)
            return Episode(**episode_data)
        except json.JSONDecodeError as e:
            logger.warning(f"Cannot parse result {result} as python dict.")
            raise e

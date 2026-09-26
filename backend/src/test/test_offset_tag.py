from module.utils.torrent_tags import format_offset_tag, parse_offset_tag


def test_offset_tag_format_and_parse() -> None:
    assert format_offset_tag(0) is None
    assert format_offset_tag(2) == "ab-offset=2"
    assert format_offset_tag(-2) == "ab-offset=-2"
    assert parse_offset_tag("ab-offset=-2") == -2


def test_offset_tag_parse_scans_qbit_tags_and_rejects_invalid_tags() -> None:
    assert parse_offset_tag("custom, ab-offset=7, other") == 7
    assert parse_offset_tag("ab-offset=invalid, ab-offset=4") == 4
    assert parse_offset_tag("custom, autobangumi-offset-4") is None
    assert parse_offset_tag("not-ab-offset=4, custom") is None
    assert parse_offset_tag("ab-offset=4x, custom") is None
    assert parse_offset_tag("ab-offset=+4, custom") is None

class UnsupportedProviderError(Exception):
    def __init__(self, site: str) -> None:
        super().__init__(f"Site {site} is not supported")
        self.site = site


class SearchUpstreamError(Exception):
    pass

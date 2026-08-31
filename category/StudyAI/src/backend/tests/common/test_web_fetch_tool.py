import pytest

from studyai.common.errors.models import ExternalServiceError
from studyai.common.search.web_fetch_tool import _assert_public_http_url


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "http://localhost/admin",
        "http://127.0.0.1/admin",
        "http://10.0.0.1/admin",
        "http://user:password@example.com/",
    ],
)
async def test_fetch_url_rejects_non_public_destinations(url: str) -> None:
    with pytest.raises(ExternalServiceError) as error:
        await _assert_public_http_url(url)

    assert error.value.error_code == "unsafe_fetch_url"


@pytest.mark.asyncio
async def test_fetch_url_accepts_public_http_address() -> None:
    await _assert_public_http_url("https://93.184.216.34/")

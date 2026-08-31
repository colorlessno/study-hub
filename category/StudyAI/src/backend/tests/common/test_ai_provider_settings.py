from studyai.common.config.settings import Settings


def test_commercial_provider_alias_uses_custom_endpoint() -> None:
    settings = Settings(
        ai_provider="commercial",
        custom_ai_base_url="https://api.example.com/v1",
        custom_ai_api_key="test-key",
        custom_llm_model="commercial-llm",
        custom_vlm_model="commercial-vlm",
        custom_embedding_model="commercial-embedding",
    )

    assert settings.ai_provider == "custom"
    assert settings.get_ai_base_url() == "https://api.example.com/v1"
    assert settings.get_ai_headers() == {"Authorization": "Bearer test-key"}
    assert settings.get_llm_model() == "commercial-llm"
    assert settings.get_vlm_model() == "commercial-vlm"
    assert settings.get_embedding_model() == "commercial-embedding"


def test_commercial_provider_uses_llm_model_when_vlm_model_is_not_set() -> None:
    settings = Settings(
        ai_provider="commercial",
        custom_ai_base_url="https://api.example.com/v1",
        custom_llm_model="commercial-llm",
        custom_embedding_model="commercial-embedding",
    )

    assert settings.get_vlm_model() == "commercial-llm"

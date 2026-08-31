from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse


LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}


def read_int_env(name: str, default: int, minimum: int, maximum: int) -> int:
    raw_value = os.environ.get(name, str(default))
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer: {raw_value}") from exc
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}: {value}")
    return value


def read_bool_env(name: str, default: bool = False) -> bool:
    raw_value = os.environ.get(name)
    if raw_value is None:
        return default
    normalized = raw_value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ValueError(f"{name} must be true or false: {raw_value}")


HOST = os.environ.get("WEB_API_HOST", "127.0.0.1")
PORT = read_int_env("WEB_API_PORT", 9898, 1, 65535)
MAX_REQUEST_BYTES = read_int_env("WEB_API_MAX_REQUEST_BYTES", 16_384, 256, 1_048_576)
MAX_PROMPT_CHARS = read_int_env("WEB_API_MAX_PROMPT_CHARS", 4_000, 1, 100_000)
MAX_UPSTREAM_RESPONSE_BYTES = read_int_env(
    "WEB_API_MAX_UPSTREAM_RESPONSE_BYTES", 1_048_576, 1_024, 10_485_760
)
UPSTREAM_TIMEOUT_SECONDS = read_int_env("LMSTUDIO_TIMEOUT_SECONDS", 120, 1, 1_200)
LMSTUDIO_BASE_URL = os.environ.get("LMSTUDIO_BASE_URL", "http://127.0.0.1:5858")
LMSTUDIO_MODEL = os.environ.get("LMSTUDIO_MODEL", "local-model")
CORS_ORIGIN = os.environ.get("WEB_API_CORS_ORIGIN", "").strip()
ALLOW_GET_ASK = read_bool_env("WEB_API_ALLOW_GET_ASK")
ALLOW_REMOTE_BIND = read_bool_env("WEB_API_ALLOW_REMOTE_BIND")
ALLOW_REMOTE_UPSTREAM = read_bool_env("WEB_API_ALLOW_REMOTE_UPSTREAM")


class ApiRequestError(Exception):
    def __init__(self, status: int, error: str):
        super().__init__(error)
        self.status = status
        self.error = error


def validate_local_host(host: str, allow_remote: bool, setting_name: str) -> None:
    normalized = host.strip("[]").lower()
    if normalized not in LOCAL_HOSTS and not allow_remote:
        raise ValueError(
            f"{setting_name} refuses non-loopback host '{host}'. "
            f"Use the corresponding ALLOW_REMOTE setting only in an isolated environment."
        )


def validate_configuration() -> None:
    validate_local_host(HOST, ALLOW_REMOTE_BIND, "WEB_API_HOST")
    parsed = urlparse(LMSTUDIO_BASE_URL)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("LMSTUDIO_BASE_URL must be an absolute http(s) URL")
    validate_local_host(parsed.hostname, ALLOW_REMOTE_UPSTREAM, "LMSTUDIO_BASE_URL")


def call_lmstudio(prompt: str) -> str:
    validate_configuration()
    payload = {
        "model": LMSTUDIO_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "stream": False,
    }
    request = urllib.request.Request(
        f"{LMSTUDIO_BASE_URL.rstrip('/')}/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=UPSTREAM_TIMEOUT_SECONDS) as response:
        raw_body = response.read(MAX_UPSTREAM_RESPONSE_BYTES + 1)
    if len(raw_body) > MAX_UPSTREAM_RESPONSE_BYTES:
        raise ValueError("LM Studio response exceeded the configured byte limit")

    result = json.loads(raw_body.decode("utf-8"))
    try:
        answer = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Unexpected LM Studio response structure") from exc
    if not isinstance(answer, str):
        raise ValueError("Unexpected LM Studio answer type")
    return answer


def validate_prompt(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ApiRequestError(400, "prompt_required")
    prompt = value.strip()
    if len(prompt) > MAX_PROMPT_CHARS:
        raise ApiRequestError(413, "prompt_too_large")
    return prompt


def request_log_path(raw_path: str) -> str:
    return urlparse(raw_path).path


class StudyApiServer(HTTPServer):
    allow_reuse_address = True


class ApiHandler(BaseHTTPRequestHandler):
    server_version = "StudyAPI"
    sys_version = ""

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_common_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._send_json({"status": "ok"})
            return
        if parsed.path == "/fixed":
            self._send_json({"message": "fixed response"})
            return
        if parsed.path == "/ask":
            if not ALLOW_GET_ASK:
                self._send_json({"error": "get_ask_disabled", "use": "POST /ask"}, status=405)
                return
            try:
                prompt = validate_prompt(parse_qs(parsed.query).get("prompt", [""])[0])
            except ApiRequestError as exc:
                self._send_json({"error": exc.error}, status=exc.status)
                return
            self._call_upstream(prompt)
            return

        self._send_json(
            {
                "error": "not_found",
                "routes": ["GET /health", "GET /fixed", "POST /ask"],
            },
            status=404,
        )

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/ask":
            self._send_json({"error": "not_found"}, status=404)
            return

        try:
            body = self._read_json_object()
            prompt = validate_prompt(body.get("prompt"))
        except ApiRequestError as exc:
            self._send_json({"error": exc.error}, status=exc.status)
            return
        self._call_upstream(prompt)

    def _call_upstream(self, prompt: str) -> None:
        try:
            answer = call_lmstudio(prompt)
        except (urllib.error.URLError, TimeoutError) as exc:
            self.log_error("upstream connection failed: %s", type(exc).__name__)
            self._send_json({"error": "upstream_unavailable"}, status=502)
        except (json.JSONDecodeError, UnicodeError, ValueError) as exc:
            self.log_error("bad upstream response: %s", type(exc).__name__)
            self._send_json({"error": "bad_upstream_response"}, status=502)
        else:
            self._send_json({"answer": answer})

    def _read_json_object(self) -> dict[str, Any]:
        raw_length = self.headers.get("Content-Length")
        if raw_length is None:
            raise ApiRequestError(411, "content_length_required")
        try:
            content_length = int(raw_length)
        except ValueError as exc:
            raise ApiRequestError(400, "invalid_content_length") from exc
        if content_length <= 0:
            raise ApiRequestError(400, "body_required")
        if content_length > MAX_REQUEST_BYTES:
            raise ApiRequestError(413, "request_too_large")

        raw_body = self.rfile.read(content_length)
        if self.headers.get_content_type() != "application/json":
            raise ApiRequestError(415, "content_type_must_be_application_json")
        try:
            body = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ApiRequestError(400, "invalid_json") from exc
        if not isinstance(body, dict):
            raise ApiRequestError(400, "json_object_required")
        return body

    def _send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._send_common_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_common_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if CORS_ORIGIN:
            self.send_header("Access-Control-Allow-Origin", CORS_ORIGIN)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Vary", "Origin")

    def log_request(self, code: int | str = "-", size: int | str = "-") -> None:
        path_without_query = request_log_path(self.path)
        print(
            f'{self.client_address[0]} - "{self.command} {path_without_query} '
            f'{self.request_version}" {code} {size}'
        )

    def log_message(self, format: str, *args: Any) -> None:
        print(f"{self.client_address[0]} - {format % args}")


def create_server(host: str = HOST, port: int = PORT) -> StudyApiServer:
    return StudyApiServer((host, port), ApiHandler)


def main() -> None:
    validate_configuration()
    server = create_server()
    print(f"Serving on http://{HOST}:{PORT}")
    print(f"LM Studio endpoint: {LMSTUDIO_BASE_URL.rstrip('/')}/v1/chat/completions")
    print(f"GET /ask enabled: {ALLOW_GET_ASK}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

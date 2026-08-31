import json
import sys
import unittest
import urllib.error
from io import BytesIO
from http.server import HTTPServer
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import simple_web_api as api


class RequestSocket:
    def __init__(self, request_bytes):
        self.reader = BytesIO(request_bytes)
        self.sent = bytearray()

    def makefile(self, mode, _buffering=None):
        if "r" not in mode:
            raise AssertionError(f"unexpected makefile mode: {mode}")
        return self.reader

    def sendall(self, data):
        self.sent.extend(data)

    def settimeout(self, _timeout):
        return None

    def setsockopt(self, *_args):
        return None

    def shutdown(self, *_args):
        return None

    def close(self):
        return None


class RequestServer:
    server_name = "127.0.0.1"
    server_port = 0


class SimpleWebApiTest(unittest.TestCase):
    def setUp(self):
        self.original_call = api.call_lmstudio
        self.original_cors = api.CORS_ORIGIN
        self.original_get_ask = api.ALLOW_GET_ASK
        api.call_lmstudio = lambda prompt: f"mock answer: {prompt}"
        api.CORS_ORIGIN = ""
        api.ALLOW_GET_ASK = False

    def tearDown(self):
        api.call_lmstudio = self.original_call
        api.CORS_ORIGIN = self.original_cors
        api.ALLOW_GET_ASK = self.original_get_ask

    def request(self, method, path, body=None, headers=None):
        body_bytes = b"" if body is None else body.encode("utf-8")
        request_headers = {"Host": "127.0.0.1", **(headers or {})}
        if body is not None and "Content-Length" not in request_headers:
            request_headers["Content-Length"] = str(len(body_bytes))
        header_lines = "\r\n".join(
            f"{name}: {value}" for name, value in request_headers.items()
        )
        raw_request = (
            f"{method} {path} HTTP/1.1\r\n{header_lines}\r\n\r\n".encode("ascii")
            + body_bytes
        )
        request_socket = RequestSocket(raw_request)
        api.ApiHandler(request_socket, ("127.0.0.1", 12345), RequestServer())

        raw_headers, raw_body = bytes(request_socket.sent).split(b"\r\n\r\n", 1)
        response_lines = raw_headers.decode("iso-8859-1").split("\r\n")
        status = int(response_lines[0].split()[1])
        response_headers = dict(line.split(": ", 1) for line in response_lines[1:])
        decoded_body = raw_body.decode("utf-8")
        return status, response_headers, json.loads(decoded_body) if decoded_body else None

    def test_server_processes_requests_sequentially(self):
        self.assertTrue(issubclass(api.StudyApiServer, HTTPServer))
        self.assertEqual(api.StudyApiServer.__mro__[:2], (api.StudyApiServer, HTTPServer))

    def test_health_is_available_without_upstream(self):
        status, headers, body = self.request("GET", "/health")

        self.assertEqual(status, 200)
        self.assertEqual(body, {"status": "ok"})
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_fixed_response_is_deterministic(self):
        status, _, body = self.request("GET", "/fixed")

        self.assertEqual(status, 200)
        self.assertEqual(body, {"message": "fixed response"})

    def test_post_ask_uses_mock_upstream(self):
        payload = json.dumps({"prompt": "hello"})

        status, _, body = self.request(
            "POST", "/ask", payload, {"Content-Type": "application/json"}
        )

        self.assertEqual(status, 200)
        self.assertEqual(body, {"answer": "mock answer: hello"})

    def test_missing_prompt_is_bad_request(self):
        status, _, body = self.request(
            "POST", "/ask", "{}", {"Content-Type": "application/json"}
        )

        self.assertEqual(status, 400)
        self.assertEqual(body, {"error": "prompt_required"})

    def test_invalid_json_is_bad_request(self):
        status, _, body = self.request(
            "POST", "/ask", "{bad", {"Content-Type": "application/json"}
        )

        self.assertEqual(status, 400)
        self.assertEqual(body, {"error": "invalid_json"})

    def test_json_array_is_bad_request(self):
        status, _, body = self.request(
            "POST", "/ask", "[]", {"Content-Type": "application/json"}
        )

        self.assertEqual(status, 400)
        self.assertEqual(body, {"error": "json_object_required"})

    def test_prompt_length_limit_is_enforced(self):
        payload = json.dumps({"prompt": "x" * (api.MAX_PROMPT_CHARS + 1)})

        status, _, body = self.request(
            "POST", "/ask", payload, {"Content-Type": "application/json"}
        )

        self.assertEqual(status, 413)
        self.assertEqual(body, {"error": "prompt_too_large"})

    def test_wrong_content_type_is_rejected(self):
        status, _, body = self.request("POST", "/ask", "{}", {"Content-Type": "text/plain"})

        self.assertEqual(status, 415)
        self.assertEqual(body, {"error": "content_type_must_be_application_json"})

    def test_oversized_request_is_rejected_before_body_read(self):
        status, _, body = self.request(
            "POST",
            "/ask",
            headers={
                "Content-Type": "application/json",
                "Content-Length": str(api.MAX_REQUEST_BYTES + 1),
            },
        )

        self.assertEqual(status, 413)
        self.assertEqual(body, {"error": "request_too_large"})

    def test_get_ask_is_disabled_by_default(self):
        status, _, body = self.request("GET", "/ask?prompt=secret")

        self.assertEqual(status, 405)
        self.assertEqual(body, {"error": "get_ask_disabled", "use": "POST /ask"})

    def test_request_log_path_removes_query(self):
        self.assertEqual(api.request_log_path("/ask?prompt=secret"), "/ask")

    def test_upstream_error_does_not_leak_internal_detail(self):
        def fail(_prompt):
            raise urllib.error.URLError("private upstream detail")

        api.call_lmstudio = fail
        status, _, body = self.request(
            "POST",
            "/ask",
            json.dumps({"prompt": "hello"}),
            {"Content-Type": "application/json"},
        )

        self.assertEqual(status, 502)
        self.assertEqual(body, {"error": "upstream_unavailable"})

    def test_upstream_timeout_returns_stable_error(self):
        def time_out(_prompt):
            raise TimeoutError("private timeout detail")

        api.call_lmstudio = time_out
        status, _, body = self.request(
            "POST",
            "/ask",
            json.dumps({"prompt": "hello"}),
            {"Content-Type": "application/json"},
        )

        self.assertEqual(status, 502)
        self.assertEqual(body, {"error": "upstream_unavailable"})

    def test_configured_cors_origin_is_exact(self):
        api.CORS_ORIGIN = "https://example.test"

        status, headers, _ = self.request("GET", "/health")

        self.assertEqual(status, 200)
        self.assertEqual(headers["Access-Control-Allow-Origin"], "https://example.test")

    def test_options_returns_preflight_headers_without_parallel_server(self):
        api.CORS_ORIGIN = "http://127.0.0.1:3100"

        status, headers, body = self.request(
            "OPTIONS",
            "/ask",
            headers={
                "Origin": "http://127.0.0.1:3100",
                "Access-Control-Request-Method": "POST",
            },
        )

        self.assertEqual(status, 204)
        self.assertIsNone(body)
        self.assertEqual(headers["Access-Control-Allow-Origin"], "http://127.0.0.1:3100")
        self.assertEqual(headers["Access-Control-Allow-Methods"], "GET, POST, OPTIONS")

    def test_remote_upstream_requires_explicit_opt_in(self):
        original_url = api.LMSTUDIO_BASE_URL
        original_allow = api.ALLOW_REMOTE_UPSTREAM
        try:
            api.LMSTUDIO_BASE_URL = "https://example.test"
            api.ALLOW_REMOTE_UPSTREAM = False

            with self.assertRaisesRegex(ValueError, "refuses non-loopback"):
                api.validate_configuration()
        finally:
            api.LMSTUDIO_BASE_URL = original_url
            api.ALLOW_REMOTE_UPSTREAM = original_allow


if __name__ == "__main__":
    unittest.main()

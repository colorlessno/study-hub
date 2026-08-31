from studyai.common.auth.dependencies import parse_user_from_headers


def test_parse_user_from_headers_splits_roles_and_projects():
    headers = {
        "X-User-Id": "user001",
        "X-User-Roles": "admin, editor",
        "X-Project-Ids": "projA,projB",
    }

    user = parse_user_from_headers(headers)

    assert user.user_id == "user001"
    assert user.roles == ["admin", "editor"]
    assert user.project_ids == ["projA", "projB"]
    assert user.is_authenticated is True

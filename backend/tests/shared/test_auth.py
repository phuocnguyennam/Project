import pytest
from shared.auth import get_claims, get_current_user, is_admin, require_admin


def test_get_claims():
    event = {'requestContext': {'authorizer': {'claims': {'a': 1}}}}
    assert get_claims(event) == {'a': 1}

def test_get_claims_empty():
    assert get_claims({}) == {}

def test_get_current_user_no_groups():
    event = {'requestContext': {'authorizer': {'claims': {'cognito:username': 'foo', 'sub': '123'}}}}
    u = get_current_user(event)
    assert u['username'] == 'foo'
    assert u['groups'] == []

def test_get_current_user_groups():
    event = {'requestContext': {'authorizer': {'claims': {'cognito:username': 'foo', 'cognito:groups': 'admin,user'}}}}
    u = get_current_user(event)
    assert u['groups'] == ['admin', 'user']

def test_require_admin_success():
    event = {'requestContext': {'authorizer': {'claims': {'cognito:username': 'admin', 'cognito:groups': 'admin'}}}}
    assert require_admin(event) == 'admin'

def test_require_admin_fail():
    event = {'requestContext': {'authorizer': {'claims': {'cognito:username': 'user', 'cognito:groups': 'user'}}}}
    with pytest.raises(PermissionError):
        require_admin(event)

def test_is_admin_true():
    event = {'requestContext': {'authorizer': {'claims': {'cognito:username': 'admin', 'cognito:groups': 'admin'}}}}
    assert is_admin(event) is True

def test_is_admin_false():
    event = {'requestContext': {'authorizer': {'claims': {'cognito:username': 'user', 'cognito:groups': 'user'}}}}
    assert is_admin(event) is False

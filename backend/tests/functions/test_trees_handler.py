import json

from functions.trees.handler import lambda_handler
from tests.conftest import make_api_event


def test_create_tree_success(dynamodb_table, admin_claims):
    event = make_api_event('POST', '/trees', {'name': 'Gia Pha Test'}, claims=admin_claims)
    res = lambda_handler(event, None)
    assert res['statusCode'] == 201
    body = json.loads(res['body'])
    assert body['name'] == 'Gia Pha Test'

def test_create_tree_not_admin(dynamodb_table, user_claims):
    event = make_api_event('POST', '/trees', {'name': 'Test'}, claims=user_claims)
    res = lambda_handler(event, None)
    assert res['statusCode'] == 403

def test_create_tree_empty_name(dynamodb_table, admin_claims):
    event = make_api_event('POST', '/trees', {'name': ''}, claims=admin_claims)
    res = lambda_handler(event, None)
    assert res['statusCode'] == 400

def test_list_trees(dynamodb_table, admin_claims):
    event = make_api_event('POST', '/trees', {'name': 'Tree 1'}, claims=admin_claims)
    lambda_handler(event, None)
    event2 = make_api_event('GET', '/trees', claims=admin_claims)
    res = lambda_handler(event2, None)
    assert res['statusCode'] == 200
    body = json.loads(res['body'])
    assert len(body['trees']) == 1

def test_get_tree(dynamodb_table, admin_claims):
    event = make_api_event('POST', '/trees', {'name': 'Tree 1'}, claims=admin_claims)
    create_res = lambda_handler(event, None)
    tree_id = json.loads(create_res['body'])['treeId']

    get_event = make_api_event('GET', f'/trees/{tree_id}', path_params={'treeId': tree_id}, claims=admin_claims)
    res = lambda_handler(get_event, None)
    assert res['statusCode'] == 200
    body = json.loads(res['body'])
    assert body['name'] == 'Tree 1'

def test_get_tree_not_found(dynamodb_table, admin_claims):
    get_event = make_api_event('GET', '/trees/invalid', path_params={'treeId': 'invalid'}, claims=admin_claims)
    res = lambda_handler(get_event, None)
    assert res['statusCode'] == 404

def test_get_tree_unauthorized(dynamodb_table, user_claims, admin_claims):
    event = make_api_event('POST', '/trees', {'name': 'Tree 1'}, claims=admin_claims)
    create_res = lambda_handler(event, None)
    tree_id = json.loads(create_res['body'])['treeId']

    get_event = make_api_event('GET', f'/trees/{tree_id}', path_params={'treeId': tree_id}, claims=user_claims)
    res = lambda_handler(get_event, None)
    assert res['statusCode'] == 403

def test_update_tree(dynamodb_table, admin_claims):
    event = make_api_event('POST', '/trees', {'name': 'Tree 1'}, claims=admin_claims)
    create_res = lambda_handler(event, None)
    tree_id = json.loads(create_res['body'])['treeId']

    upd_event = make_api_event(
        'PUT', f'/trees/{tree_id}',
        {'name': 'Tree Updated'},
        path_params={'treeId': tree_id},
        claims=admin_claims,
    )
    res = lambda_handler(upd_event, None)
    assert res['statusCode'] == 200
    assert json.loads(res['body'])['name'] == 'Tree Updated'

def test_delete_tree(dynamodb_table, admin_claims):
    event = make_api_event('POST', '/trees', {'name': 'Tree 1'}, claims=admin_claims)
    create_res = lambda_handler(event, None)
    tree_id = json.loads(create_res['body'])['treeId']

    del_event = make_api_event('DELETE', f'/trees/{tree_id}', path_params={'treeId': tree_id}, claims=admin_claims)
    res = lambda_handler(del_event, None)
    assert res['statusCode'] == 200

    get_event = make_api_event('GET', f'/trees/{tree_id}', path_params={'treeId': tree_id}, claims=admin_claims)
    res_get = lambda_handler(get_event, None)
    assert res_get['statusCode'] == 404

def test_route_not_found():
    event = make_api_event('PATCH', '/trees')
    res = lambda_handler(event, None)
    assert res['statusCode'] == 404

import json

from shared.response import error, success


def test_success_default_status():
    res = success({'data': 123})
    assert res['statusCode'] == 200
    assert json.loads(res['body']) == {'data': 123}
    assert 'Access-Control-Allow-Origin' in res['headers']

def test_success_custom_status():
    res = success({'data': 123}, 201)
    assert res['statusCode'] == 201
    assert json.loads(res['body']) == {'data': 123}

def test_error_default():
    res = error('Bad Request')
    assert res['statusCode'] == 400
    assert json.loads(res['body']) == {'message': 'Bad Request'}

def test_error_custom_with_details():
    res = error('Not Found', 404, {'foo': 'bar'})
    assert res['statusCode'] == 404
    assert json.loads(res['body']) == {'message': 'Not Found', 'details': {'foo': 'bar'}}

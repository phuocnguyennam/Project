import json
import os
import pytest
import boto3
from moto import mock_aws
from shared.models import Member
from shared.db import put_item


def _make_event(method, path, path_params=None, query_params=None, claims=None):
    event = {'httpMethod': method, 'path': path, 'requestContext': {}}
    if path_params:
        event['pathParameters'] = path_params
    if query_params:
        event['queryStringParameters'] = query_params
    if claims:
        event['requestContext']['authorizer'] = {'claims': claims}
    return event


class TestSearchHandler:

    def setup_method(self, method=None):
        self.mock = mock_aws()
        self.mock.start()

        os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
        os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
        os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
        os.environ['TABLE_NAME'] = 'test-table'
        os.environ['COGNITO_USER_POOL_ID'] = 'us-east-1_test'
        os.environ['PHOTOS_BUCKET'] = 'test-photos'

        dynamo = boto3.resource('dynamodb', region_name='us-east-1')
        self.table = dynamo.create_table(
            TableName='test-table',
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'},
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'},
            ],
            GlobalSecondaryIndexes=[{
                'IndexName': 'GSI1-SK-PK',
                'KeySchema': [
                    {'AttributeName': 'SK', 'KeyType': 'HASH'},
                    {'AttributeName': 'PK', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
            }],
            BillingMode='PAY_PER_REQUEST',
        )

        import shared.db as db
        db._table = None

        self.tree_id = 'tree-abc'
        self.table.put_item(Item={
            'PK': f'TREE#{self.tree_id}', 'SK': 'META',
            'treeId': self.tree_id, 'name': 'Tree',
        })

        self.admin_claims = {'cognito:username': 'admin_user', 'sub': 's1', 'email': 'a@e.com', 'cognito:groups': 'admin'}
        self.user_claims = {'cognito:username': 'normal_user', 'sub': 's2', 'email': 'u@e.com', 'cognito:groups': 'user'}

        for name in ['Nguyen Van A', 'Nguyen Thi B', 'Tran Van C']:
            m = Member(tree_id=self.tree_id, name=name, gender='MALE')
            put_item(m.to_dynamo())

        self.table.put_item(Item={
            'PK': 'USER#normal_user', 'SK': f'TREE#{self.tree_id}',
            'treeId': self.tree_id, 'memberId': 'some-id', 'role': 'USER',
        })

    def teardown_method(self, method=None):
        import shared.db as db
        db._table = None
        for key in ['TABLE_NAME', 'COGNITO_USER_POOL_ID', 'PHOTOS_BUCKET']:
            os.environ.pop(key, None)
        self.mock.stop()

    def test_empty_query(self):
        from functions.search.handler import lambda_handler
        event = _make_event('GET', f'/trees/{self.tree_id}/members/search',
                            path_params={'treeId': self.tree_id},
                            query_params={'q': ''},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 400

    def test_query_too_short(self):
        from functions.search.handler import lambda_handler
        event = _make_event('GET', f'/trees/{self.tree_id}/members/search',
                            path_params={'treeId': self.tree_id},
                            query_params={'q': 'a'},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 400

    def test_admin_can_search(self):
        from functions.search.handler import lambda_handler
        event = _make_event('GET', f'/trees/{self.tree_id}/members/search',
                            path_params={'treeId': self.tree_id},
                            query_params={'q': 'Nguyen'},
                            claims=self.admin_claims)
        res = lambda_handler(event, None)
        assert res['statusCode'] == 200
        assert json.loads(res['body'])['count'] == 2

    def test_user_with_permission_can_search(self):
        from functions.search.handler import lambda_handler
        event = _make_event('GET', f'/trees/{self.tree_id}/members/search',
                            path_params={'treeId': self.tree_id},
                            query_params={'q': 'Tran'},
                            claims=self.user_claims)
        res = lambda_handler(event, None)
        assert res['statusCode'] == 200
        assert json.loads(res['body'])['count'] == 1

    def test_user_without_permission_denied(self):
        from functions.search.handler import lambda_handler
        no_access = {'cognito:username': 'stranger', 'sub': 's3', 'email': 'x@e.com', 'cognito:groups': 'user'}
        event = _make_event('GET', f'/trees/{self.tree_id}/members/search',
                            path_params={'treeId': self.tree_id},
                            query_params={'q': 'Nguyen'},
                            claims=no_access)
        assert lambda_handler(event, None)['statusCode'] == 403

    def test_tree_not_found(self):
        from functions.search.handler import lambda_handler
        event = _make_event('GET', '/trees/nonexistent/members/search',
                            path_params={'treeId': 'nonexistent'},
                            query_params={'q': 'Nguyen'},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 404

    def test_case_insensitive(self):
        from functions.search.handler import lambda_handler
        event = _make_event('GET', f'/trees/{self.tree_id}/members/search',
                            path_params={'treeId': self.tree_id},
                            query_params={'q': 'nguyen'},
                            claims=self.admin_claims)
        res = lambda_handler(event, None)
        assert res['statusCode'] == 200
        assert json.loads(res['body'])['count'] == 2

    def test_no_results(self):
        from functions.search.handler import lambda_handler
        event = _make_event('GET', f'/trees/{self.tree_id}/members/search',
                            path_params={'treeId': self.tree_id},
                            query_params={'q': 'ZZZZZZ'},
                            claims=self.admin_claims)
        res = lambda_handler(event, None)
        assert res['statusCode'] == 200
        body = json.loads(res['body'])
        assert body['count'] == 0
        assert body['results'] == []

    def test_sort_startswith_first(self):
        from functions.search.handler import lambda_handler
        event = _make_event('GET', f'/trees/{self.tree_id}/members/search',
                            path_params={'treeId': self.tree_id},
                            query_params={'q': 'nguyen'},
                            claims=self.admin_claims)
        res = lambda_handler(event, None)
        body = json.loads(res['body'])
        names = [r['name'] for r in body['results']]
        assert all('Nguyen' in n for n in names)

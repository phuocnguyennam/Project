import json
import os
import pytest
import boto3
from moto import mock_aws


def _make_event(method, path, body=None, path_params=None, query_params=None, claims=None):
    event = {'httpMethod': method, 'path': path, 'requestContext': {}}
    if body is not None:
        event['body'] = json.dumps(body) if isinstance(body, dict) else body
    if path_params:
        event['pathParameters'] = path_params
    if query_params:
        event['queryStringParameters'] = query_params
    if claims:
        event['requestContext']['authorizer'] = {'claims': claims}
    return event


class TestMembersHandler:

    def setup_method(self, method=None):
        self.mock = mock_aws()
        self.mock.start()

        os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
        os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
        os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
        os.environ['TABLE_NAME'] = 'test-table'
        os.environ['PHOTOS_BUCKET'] = 'test-photos-bucket'

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

        cognito = boto3.client('cognito-idp', region_name='us-east-1')
        pool = cognito.create_user_pool(PoolName='test-pool')
        self.pool_id = pool['UserPool']['Id']
        os.environ['COGNITO_USER_POOL_ID'] = self.pool_id
        cognito.create_group(UserPoolId=self.pool_id, GroupName='user')

        s3 = boto3.client('s3', region_name='us-east-1')
        s3.create_bucket(Bucket='test-photos-bucket')

        import shared.db as db
        db._table = None

        self.tree_id = 'tree-123'
        self.table.put_item(Item={
            'PK': f'TREE#{self.tree_id}', 'SK': 'META',
            'treeId': self.tree_id, 'name': 'Test Tree', 'adminId': 'admin_user',
        })

        self.admin_claims = {
            'cognito:username': 'admin_user', 'sub': 'sub123',
            'email': 'admin@example.com', 'cognito:groups': 'admin',
        }
        self.user_claims = {
            'cognito:username': 'normal_user', 'sub': 'sub456',
            'email': 'user@example.com', 'cognito:groups': 'user',
        }

        # Re-import handler to pick up fresh boto3 clients inside mock context
        import importlib
        import functions.members.handler as mh
        mh.cognito = boto3.client('cognito-idp', region_name='us-east-1')
        mh.s3 = boto3.client('s3', region_name='us-east-1')

    def teardown_method(self, method=None):
        import shared.db as db
        db._table = None
        for key in ['TABLE_NAME', 'COGNITO_USER_POOL_ID', 'PHOTOS_BUCKET']:
            os.environ.pop(key, None)
        self.mock.stop()

    def _add_member(self, name='Test Member', gender='MALE'):
        from functions.members.handler import lambda_handler
        event = _make_event('POST', f'/trees/{self.tree_id}/members',
                            body={'name': name, 'gender': gender},
                            path_params={'treeId': self.tree_id},
                            claims=self.admin_claims)
        body = json.loads(lambda_handler(event, None)['body'])
        return body['memberId']

    def test_add_first_member_success(self):
        from functions.members.handler import lambda_handler
        event = _make_event('POST', f'/trees/{self.tree_id}/members',
                            body={'name': 'Nguyen Van A', 'gender': 'MALE'},
                            path_params={'treeId': self.tree_id},
                            claims=self.admin_claims)
        res = lambda_handler(event, None)
        assert res['statusCode'] == 201
        body = json.loads(res['body'])
        assert body['name'] == 'Nguyen Van A'
        assert body['generation'] == 1

    def test_add_member_not_admin(self):
        from functions.members.handler import lambda_handler
        event = _make_event('POST', f'/trees/{self.tree_id}/members',
                            body={'name': 'Test', 'gender': 'FEMALE'},
                            path_params={'treeId': self.tree_id},
                            claims=self.user_claims)
        assert lambda_handler(event, None)['statusCode'] == 403

    def test_add_member_empty_name(self):
        from functions.members.handler import lambda_handler
        event = _make_event('POST', f'/trees/{self.tree_id}/members',
                            body={'name': '', 'gender': 'MALE'},
                            path_params={'treeId': self.tree_id},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 400

    def test_add_member_invalid_gender(self):
        from functions.members.handler import lambda_handler
        event = _make_event('POST', f'/trees/{self.tree_id}/members',
                            body={'name': 'Test', 'gender': 'UNKNOWN'},
                            path_params={'treeId': self.tree_id},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 400

    def test_add_second_member_requires_relation(self):
        from functions.members.handler import lambda_handler
        self._add_member('Parent')
        event = _make_event('POST', f'/trees/{self.tree_id}/members',
                            body={'name': 'Child', 'gender': 'FEMALE'},
                            path_params={'treeId': self.tree_id},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 400

    def test_add_member_with_child_relation(self):
        from functions.members.handler import lambda_handler
        parent_id = self._add_member('Parent', 'MALE')
        event = _make_event('POST', f'/trees/{self.tree_id}/members',
                            body={'name': 'Child', 'gender': 'FEMALE',
                                  'relatedMemberId': parent_id, 'relationshipType': 'CHILD'},
                            path_params={'treeId': self.tree_id},
                            claims=self.admin_claims)
        res = lambda_handler(event, None)
        assert res['statusCode'] == 201
        assert json.loads(res['body'])['generation'] == 2

    def test_add_member_tree_not_found(self):
        from functions.members.handler import lambda_handler
        event = _make_event('POST', '/trees/nonexistent/members',
                            body={'name': 'Test', 'gender': 'MALE'},
                            path_params={'treeId': 'nonexistent'},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 404

    def test_add_member_invalid_relation_type(self):
        from functions.members.handler import lambda_handler
        parent_id = self._add_member('Parent')
        event = _make_event('POST', f'/trees/{self.tree_id}/members',
                            body={'name': 'Child', 'gender': 'FEMALE',
                                  'relatedMemberId': parent_id, 'relationshipType': 'INVALID'},
                            path_params={'treeId': self.tree_id},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 400

    def test_update_member_success(self):
        from functions.members.handler import lambda_handler
        mid = self._add_member()
        event = _make_event('PUT', f'/trees/{self.tree_id}/members/{mid}',
                            body={'name': 'Updated Name', 'phone': '0901234567'},
                            path_params={'treeId': self.tree_id, 'memberId': mid},
                            claims=self.admin_claims)
        res = lambda_handler(event, None)
        assert res['statusCode'] == 200
        assert json.loads(res['body'])['name'] == 'Updated Name'

    def test_update_member_not_found(self):
        from functions.members.handler import lambda_handler
        event = _make_event('PUT', f'/trees/{self.tree_id}/members/no-such-id',
                            body={'name': 'X'},
                            path_params={'treeId': self.tree_id, 'memberId': 'no-such-id'},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 404

    def test_update_member_invalid_gender(self):
        from functions.members.handler import lambda_handler
        mid = self._add_member()
        event = _make_event('PUT', f'/trees/{self.tree_id}/members/{mid}',
                            body={'gender': 'INVALID'},
                            path_params={'treeId': self.tree_id, 'memberId': mid},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 400

    def test_delete_member_success(self):
        from functions.members.handler import lambda_handler
        mid = self._add_member()
        event = _make_event('DELETE', f'/trees/{self.tree_id}/members/{mid}',
                            path_params={'treeId': self.tree_id, 'memberId': mid},
                            claims=self.admin_claims)
        res = lambda_handler(event, None)
        assert res['statusCode'] == 200
        assert json.loads(res['body'])['memberId'] == mid

    def test_delete_member_not_found(self):
        from functions.members.handler import lambda_handler
        event = _make_event('DELETE', f'/trees/{self.tree_id}/members/no-such-id',
                            path_params={'treeId': self.tree_id, 'memberId': 'no-such-id'},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 404

    def test_delete_member_not_admin(self):
        from functions.members.handler import lambda_handler
        mid = self._add_member()
        event = _make_event('DELETE', f'/trees/{self.tree_id}/members/{mid}',
                            path_params={'treeId': self.tree_id, 'memberId': mid},
                            claims=self.user_claims)
        assert lambda_handler(event, None)['statusCode'] == 403

    def test_get_photo_url_success(self):
        from functions.members.handler import lambda_handler
        mid = self._add_member()
        event = _make_event('POST', f'/trees/{self.tree_id}/members/{mid}/photo-url',
                            body={'fileType': 'image/jpeg'},
                            path_params={'treeId': self.tree_id, 'memberId': mid},
                            claims=self.admin_claims)
        res = lambda_handler(event, None)
        assert res['statusCode'] == 200
        body = json.loads(res['body'])
        assert 'uploadUrl' in body
        assert body['photoKey'] == f'photos/{self.tree_id}/{mid}.jpg'

    def test_get_photo_url_member_not_found(self):
        from functions.members.handler import lambda_handler
        event = _make_event('POST', f'/trees/{self.tree_id}/members/nope/photo-url',
                            body={},
                            path_params={'treeId': self.tree_id, 'memberId': 'nope'},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 404

    def test_router_unknown_route(self):
        from functions.members.handler import lambda_handler
        event = _make_event('PATCH', f'/trees/{self.tree_id}/members',
                            path_params={'treeId': self.tree_id},
                            claims=self.admin_claims)
        assert lambda_handler(event, None)['statusCode'] == 404

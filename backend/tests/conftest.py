import json
import os

import boto3
import pytest
from moto import mock_aws


@pytest.fixture(autouse=True)
def aws_credentials():
    """Mocked AWS Credentials for moto."""
    os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
    os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
    os.environ['AWS_SECURITY_TOKEN'] = 'testing'
    os.environ['AWS_SESSION_TOKEN'] = 'testing'
    os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

@pytest.fixture
def env_vars():
    os.environ['TABLE_NAME'] = 'test-table'
    os.environ['COGNITO_USER_POOL_ID'] = 'us-east-1_test123'
    os.environ['PHOTOS_BUCKET'] = 'test-photos-bucket'
    yield
    if 'TABLE_NAME' in os.environ:
        del os.environ['TABLE_NAME']
    if 'COGNITO_USER_POOL_ID' in os.environ:
        del os.environ['COGNITO_USER_POOL_ID']
    if 'PHOTOS_BUCKET' in os.environ:
        del os.environ['PHOTOS_BUCKET']

@pytest.fixture
def dynamodb_table(env_vars):
    with mock_aws():
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table = dynamodb.create_table(
            TableName='test-table',
            KeySchema=[
                {'AttributeName': 'PK', 'KeyType': 'HASH'},
                {'AttributeName': 'SK', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'PK', 'AttributeType': 'S'},
                {'AttributeName': 'SK', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'GSI1-SK-PK',
                    'KeySchema': [
                        {'AttributeName': 'SK', 'KeyType': 'HASH'},
                        {'AttributeName': 'PK', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'}
                }
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        # reset singleton db._table
        import shared.db as db
        db._table = None
        yield table

@pytest.fixture
def cognito_setup(env_vars):
    with mock_aws():
        client = boto3.client('cognito-idp', region_name='us-east-1')
        pool = client.create_user_pool(PoolName='test_pool')
        pool_id = pool['UserPool']['Id']
        os.environ['COGNITO_USER_POOL_ID'] = pool_id
        client.create_group(UserPoolId=pool_id, GroupName='admin')
        client.create_group(UserPoolId=pool_id, GroupName='user')
        yield client

@pytest.fixture
def s3_bucket(env_vars):
    with mock_aws():
        s3 = boto3.client('s3', region_name='us-east-1')
        s3.create_bucket(Bucket='test-photos-bucket')
        yield s3

def make_api_event(method, path, body=None, path_params=None, query_params=None, claims=None):
    event = {
        'httpMethod': method,
        'path': path,
        'requestContext': {}
    }
    if body is not None:
        event['body'] = json.dumps(body) if isinstance(body, dict) else body
    if path_params is not None:
        event['pathParameters'] = path_params
    if query_params is not None:
        event['queryStringParameters'] = query_params
    if claims is not None:
        event['requestContext']['authorizer'] = {'claims': claims}
    return event

@pytest.fixture
def admin_claims():
    return {
        'cognito:username': 'admin_user',
        'sub': 'sub123',
        'email': 'admin@example.com',
        'cognito:groups': 'admin'
    }

@pytest.fixture
def user_claims():
    return {
        'cognito:username': 'normal_user',
        'sub': 'sub456',
        'email': 'user@example.com',
        'cognito:groups': 'user'
    }

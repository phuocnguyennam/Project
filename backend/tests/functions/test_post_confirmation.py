import os
from unittest.mock import MagicMock

import boto3
from moto import mock_aws


class TestPostConfirmation:

    def setup_method(self, method=None):
        self.mock = mock_aws()
        self.mock.start()

        os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
        os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
        os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

        cognito = boto3.client('cognito-idp', region_name='us-east-1')
        pool = cognito.create_user_pool(PoolName='test-pool')
        self.pool_id = pool['UserPool']['Id']
        cognito.create_group(UserPoolId=self.pool_id, GroupName='admin')
        cognito.admin_create_user(
            UserPoolId=self.pool_id,
            Username='testuser',
            TemporaryPassword='Temp1234!',
            MessageAction='SUPPRESS',
        )

        import functions.auth.post_confirmation as pc
        pc.cognito_client = boto3.client('cognito-idp', region_name='us-east-1')

    def teardown_method(self, method=None):
        self.mock.stop()

    def _make_event(self, trigger_source='PostConfirmation_ConfirmSignUp', username='testuser'):
        return {
            'userPoolId': self.pool_id,
            'userName': username,
            'triggerSource': trigger_source,
            'request': {},
            'response': {},
        }

    def test_confirm_signup_adds_to_admin_group(self):
        import functions.auth.post_confirmation as pc
        event = self._make_event('PostConfirmation_ConfirmSignUp')
        result = pc.handler(event, None)
        assert result == event
        cognito = boto3.client('cognito-idp', region_name='us-east-1')
        groups = cognito.admin_list_groups_for_user(UserPoolId=self.pool_id, Username='testuser')
        assert 'admin' in [g['GroupName'] for g in groups['Groups']]

    def test_other_trigger_source_no_action(self):
        import functions.auth.post_confirmation as pc
        event = self._make_event('PostConfirmation_ConfirmForgotPassword')
        result = pc.handler(event, None)
        assert result == event
        cognito = boto3.client('cognito-idp', region_name='us-east-1')
        groups = cognito.admin_list_groups_for_user(UserPoolId=self.pool_id, Username='testuser')
        assert len(groups['Groups']) == 0

    def test_always_returns_event(self):
        import functions.auth.post_confirmation as pc
        event = self._make_event()
        assert pc.handler(event, None) is event

    def test_error_swallowed_returns_event(self):
        import functions.auth.post_confirmation as pc
        mock_client = MagicMock()
        mock_client.admin_add_user_to_group.side_effect = Exception('Simulated error')
        pc.cognito_client = mock_client
        event = self._make_event()
        result = pc.handler(event, None)
        assert result == event

    def test_missing_user_pool_id_swallowed(self):
        import functions.auth.post_confirmation as pc
        event = {'triggerSource': 'PostConfirmation_ConfirmSignUp', 'userName': 'x'}
        result = pc.handler(event, None)
        assert result == event

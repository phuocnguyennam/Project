"""
Cognito Post-Confirmation Lambda Trigger.
Tự động thêm user mới (admin) vào Cognito group 'admin' sau khi xác thực email.
"""
import os
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cognito_client = boto3.client('cognito-idp')


def handler(event: dict, context) -> dict:
    """Lambda handler cho Cognito PostConfirmation trigger."""
    logger.info(f"PostConfirmation trigger: {event.get('triggerSource')}")
    try:
        user_pool_id = event['userPoolId']
        username = event['userName']
        trigger_source = event.get('triggerSource', '')

        # Chỉ xử lý khi user tự xác thực (không xử lý AdminCreateUser)
        if trigger_source == 'PostConfirmation_ConfirmSignUp':
            cognito_client.admin_add_user_to_group(
                UserPoolId=user_pool_id,
                Username=username,
                GroupName='admin'
            )
            logger.info(f"Added {username} to admin group")
    except Exception as e:
        logger.error(f"Error in PostConfirmation: {str(e)}")
        # Không raise để không block sign-up flow
    return event  # Cognito expects the event returned

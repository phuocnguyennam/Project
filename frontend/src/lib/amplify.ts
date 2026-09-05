import { Amplify } from 'aws-amplify';

/**
 * Bootstrap AWS Amplify v6 với Cognito configuration.
 * Phải được gọi trước khi render App (trong main.tsx).
 */
export function configureAmplify(): void {
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
  const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

  if (!userPoolId || !userPoolClientId) {
    console.warn(
      '[Amplify] VITE_COGNITO_USER_POOL_ID hoặc VITE_COGNITO_CLIENT_ID chưa được cấu hình. '
      + 'Hãy điền vào file .env sau khi chạy `sam deploy`.'
    );
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  });
}

export type CredentialsValidationError =
  'username-required' | 'password-required' | 'password-too-short';

export interface Credentials {
  username: string;
  password: string;
}

export function validateCredentials({
  username,
  password,
}: Credentials): CredentialsValidationError | null {
  if (username === '') return 'username-required';
  if (password === '') return 'password-required';
  if (password.length < 8) return 'password-too-short';
  return null;
}

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

export interface SignUpInput extends SignInInput {
  readonly displayName: string;
  readonly workspaceName?: string;
}

export interface SignUpResult {
  readonly confirmationRequired: boolean;
  readonly workspaceId: string | null;
}

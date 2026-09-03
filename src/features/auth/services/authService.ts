import { AppError } from '../../../core/errors/AppError.ts';
import type {
  AuthFailureLike, AuthGateway, AuthSubscription, EnjazAuthEvent, EnjazAuthSession, EnjazAuthUser,
} from '../../../core/auth/authGateway.ts';
import type { SignInInput, SignUpInput, SignUpResult } from '../domain/authTypes.ts';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_NEW_PASSWORD_LENGTH = 10;

function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(value)) {
    throw new AppError('Invalid email address', { code: 'VALIDATION_FAILED', userMessage: 'أدخل بريداً إلكترونياً صالحاً.' });
  }
  return value;
}

function requirePassword(password: string, enforceStrength: boolean): string {
  if (!password) throw new AppError('Password is required', { code: 'VALIDATION_FAILED', userMessage: 'أدخل كلمة المرور.' });
  if (enforceStrength && password.length < MIN_NEW_PASSWORD_LENGTH) {
    throw new AppError('Password is too short', {
      code: 'VALIDATION_FAILED',
      userMessage: `استخدم كلمة مرور لا تقل عن ${MIN_NEW_PASSWORD_LENGTH} أحرف.`,
    });
  }
  return password;
}

function normalizeAuthFailure(error: AuthFailureLike): AppError {
  const code = error.code ?? '';
  if (code === 'invalid_credentials') {
    return new AppError('Invalid credentials', {
      code: 'AUTH_INVALID_CREDENTIALS', cause: error, userMessage: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    });
  }
  if (error.status === 429 || code.includes('rate_limit')) {
    return new AppError('Authentication rate limited', {
      code: 'AUTH_RATE_LIMITED', cause: error, userMessage: 'محاولات كثيرة خلال وقت قصير. حاول لاحقاً.',
    });
  }
  if (error.status === 401 || ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'jwt_expired'].includes(code)) {
    return new AppError('Authentication session expired', {
      code: 'AUTH_SESSION_EXPIRED', cause: error, userMessage: 'انتهت جلسة الدخول. سجّل الدخول من جديد للمتابعة.',
    });
  }
  if (/failed to fetch|network|timeout|connection|abort/i.test(error.message ?? '')) {
    return new AppError('Authentication service unavailable', {
      code: 'NETWORK_UNAVAILABLE', cause: error, userMessage: 'تعذر الاتصال بخدمة الدخول. تحقق من الشبكة وحاول مجدداً.',
    });
  }
  return new AppError(error.message ?? 'Authentication operation failed', {
    code: 'AUTH_OPERATION_FAILED', cause: error, userMessage: 'تعذر إكمال عملية الدخول. تحقق من الاتصال وحاول مرة أخرى.',
  });
}

export interface AuthService {
  getVerifiedUser(): Promise<EnjazAuthUser | null>;
  signIn(input: SignInInput): Promise<EnjazAuthUser>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  bootstrapWorkspace(displayName: string, workspaceName?: string): Promise<string>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
  onAuthStateChange(callback: (event: EnjazAuthEvent, session: EnjazAuthSession | null) => void): AuthSubscription;
}

export function createAuthService(gateway: AuthGateway): AuthService {
  const bootstrapWorkspace = async (displayName: string, workspaceName?: string): Promise<string> => {
    const name = displayName.trim();
    if (!name) throw new AppError('Display name is required', { code: 'VALIDATION_FAILED', userMessage: 'أدخل اسمك.' });
    const { data, error } = await gateway.bootstrapWorkspace(name, workspaceName);
    if (error || typeof data !== 'string') throw normalizeAuthFailure(error ?? { message: 'Workspace bootstrap returned no id' });
    return data;
  };

  return Object.freeze({
    async getVerifiedUser(): Promise<EnjazAuthUser | null> {
      const { data, error } = await gateway.getUser();
      if (error) {
        if (error.name === 'AuthSessionMissingError') return null;
        throw normalizeAuthFailure(error);
      }
      return data.user;
    },

    async signIn(input: SignInInput): Promise<EnjazAuthUser> {
      const { data, error } = await gateway.signInWithPassword({
        email: normalizeEmail(input.email), password: requirePassword(input.password, false),
      });
      if (error || !data.user) throw normalizeAuthFailure(error ?? { message: 'Sign-in returned no user' });
      return data.user;
    },

    async signUp(input: SignUpInput): Promise<SignUpResult> {
      const displayName = input.displayName.trim();
      if (!displayName) throw new AppError('Display name is required', { code: 'VALIDATION_FAILED', userMessage: 'أدخل اسمك.' });
      const { data, error } = await gateway.signUp({
        email: normalizeEmail(input.email), password: requirePassword(input.password, true), displayName,
      });
      if (error || !data.user) throw normalizeAuthFailure(error ?? { message: 'Sign-up returned no user' });
      if (!data.session) return Object.freeze({ confirmationRequired: true, workspaceId: null });
      const workspaceId = await bootstrapWorkspace(displayName, input.workspaceName);
      return Object.freeze({ confirmationRequired: false, workspaceId });
    },

    bootstrapWorkspace,

    async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
      const error = await gateway.requestPasswordReset(normalizeEmail(email), redirectTo);
      if (error) throw normalizeAuthFailure(error);
    },

    async updatePassword(password: string): Promise<void> {
      const error = await gateway.updatePassword(requirePassword(password, true));
      if (error) throw normalizeAuthFailure(error);
    },

    async signOut(): Promise<void> {
      const error = await gateway.signOut();
      if (error) throw normalizeAuthFailure(error);
    },

    onAuthStateChange(callback: (event: EnjazAuthEvent, session: EnjazAuthSession | null) => void) {
      return gateway.onAuthStateChange(callback);
    },
  });
}

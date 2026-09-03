export const ROUTES = Object.freeze({
  root: '/',
  foundation: '/foundation',
  identity: '/foundation/identity',
  tokens: '/foundation/tokens',
  typography: '/foundation/typography',
  login: '/auth/login',
  signUp: '/auth/signup',
  forgotPassword: '/auth/forgot-password',
  updatePassword: '/auth/update-password',
  appHome: '/app',
} as const);

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('Warning: JWT_SECRET is not defined in environment variables. Using fallback.');
  } else {
    console.log(`JWT_SECRET loaded (starts with: ${secret.substring(0, 3)}...)`);
  }
  return secret || 'fallback-secret-for-dev-only';
};

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/'
};

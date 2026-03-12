import dotenv from 'dotenv';
dotenv.config();
if (!process.env.JWT_SECRET) {
  console.warn('CRITICAL: JWT_SECRET is not defined in environment variables. Authentication may be unstable.');
}
console.log('Environment variables loaded');

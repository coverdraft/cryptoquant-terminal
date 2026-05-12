import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Simple auth for single-user terminal
// In production, replace with proper user management

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Admin',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.password) return null;

        // Simple single-user auth - just check password
        if (credentials.password === ADMIN_PASSWORD) {
          return { id: '1', name: 'Admin', email: 'admin@cryptoquant.terminal' };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);

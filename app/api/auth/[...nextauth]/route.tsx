import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.password) {
          throw new Error('No user found with this email');
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch) {
          throw new Error('Incorrect password');
        }

        // Gate: Ensure user has verified their email before allowing login
        if (!user.emailVerified) {
          throw new Error('Please confirm your email address before logging in.');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          basicTrainingPassed: user.basicTrainingPassed,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.basicTrainingPassed = user.basicTrainingPassed;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.id || token.sub;
        session.user.role = token.role;
        session.user.basicTrainingPassed = token.basicTrainingPassed;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
import { NextAuthOptions } from 'next-auth';
// Import your database adapter or providers here (whatever you already use in your [...nextauth]/route.ts)

export const authOptions: NextAuthOptions = {
  providers: [
    // Keep your existing providers here (e.g., CredentialsProvider, Google, etc.)
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    }
  }
};
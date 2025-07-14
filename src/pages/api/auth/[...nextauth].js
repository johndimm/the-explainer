import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.email) return;
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO users (email, created_at)
           VALUES ($1, NOW())
           ON CONFLICT (email) DO NOTHING`,
          [user.email]
        );
      } finally {
        client.release();
      }
    },
  },
}); 
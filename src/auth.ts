import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

async function getUser(email: string) {
    try {
        await dbConnect();
        const user = await User.findOne({ email });
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    secret: process.env.AUTH_SECRET,
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) return user;
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google') {
                await dbConnect();
                const existingUser = await User.findOne({ email: user.email });
                if (!existingUser) {
                    // Create new user
                    // Split name if needed or use profile fields
                    const name = profile?.given_name || user.name?.split(' ')[0] || 'User';
                    const lastName = profile?.family_name || user.name?.split(' ').slice(1).join(' ') || '';

                    // Generate random password
                    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
                    const hashedPassword = await bcrypt.hash(randomPassword, 10);

                    const newUser = new User({
                        email: user.email,
                        password: hashedPassword,
                        name,
                        lastName
                    });
                    await newUser.save();
                }
            }
            return true;
        },
        async session({ session, token }) {
            if (token?.sub) {
                session.user.id = token.sub;
            }
            if (token?.name) {
                session.user.name = token.name;
            }
            // @ts-ignore
            if (token?.lastName) session.user.lastName = token.lastName;

            return session;
        },
        async jwt({ token, user, account }) {
            // Initial sign in
            if (user) { // user object from provider or authorize
                if (account?.provider === 'google') {
                    // We need to fetch the DB ID because Google ID is not our DB ID
                    await dbConnect();
                    const dbUser = await User.findOne({ email: user.email });
                    if (dbUser) {
                        token.sub = dbUser._id.toString();
                        token.name = dbUser.name;
                        // @ts-ignore
                        token.lastName = dbUser.lastName;
                    }
                } else {
                    // Credentials provider: user is already our DB user
                    token.sub = user._id ? user._id.toString() : token.sub;
                    token.name = user.name;
                    // @ts-ignore
                    token.lastName = user.lastName;
                }
            }
            return token;
        },
    },
});

'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

export async function register(
    prevState: string | undefined,
    formData: FormData,
) {
    const name = formData.get('name') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const inviteCode = formData.get('inviteCode') as string;

    if (!email || !password || !name || !lastName || !inviteCode) {
        return 'Please fill in all fields.';
    }

    // Validation: Invite Code
    if (inviteCode !== process.env.INVITE_CODE) {
        return 'Código de invitación inválido.';
    }

    try {
        await dbConnect();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return 'User already exists.';
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            lastName,
            email,
            password: hashedPassword,
        });

        await newUser.save();
    } catch (error) {
        console.error('Registration error:', error);
        return 'Failed to register user.';
    }

    // Automatically sign in after registration
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

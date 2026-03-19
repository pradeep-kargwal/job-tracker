import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required'),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const register = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (existingUser) {
        throw new AppError('Email already registered', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
        data: {
            email: data.email,
            passwordHash,
            name: data.name,
        },
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
        },
    });

    const secret = process.env.JWT_SECRET || 'default-secret-key';
    const options: SignOptions = { expiresIn: '24h' };
    const token = jwt.sign(
        { userId: user.id, email: user.email },
        secret,
        options
    );

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    const response: ApiResponse = {
        success: true,
        message: 'User registered successfully',
        data: { user, token },
    };

    res.status(201).json(response);
};

export const login = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (!user) {
        throw new AppError('Invalid email or password', 401);
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
        throw new AppError('Invalid email or password', 401);
    }

    const secret = process.env.JWT_SECRET || 'default-secret-key';
    const options: SignOptions = { expiresIn: '24h' };
    const token = jwt.sign(
        { userId: user.id, email: user.email },
        secret,
        options
    );

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
    });

    const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            token,
        },
    };

    res.json(response);
};

export const logout = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    res.clearCookie('token');

    const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
    };

    res.json(response);
};

export const getMe = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'User retrieved successfully',
        data: user,
    };

    res.json(response);
};

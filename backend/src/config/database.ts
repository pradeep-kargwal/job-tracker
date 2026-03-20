import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;

export async function connectDatabase() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
}

export async function disconnectDatabase() {
    await prisma.$disconnect();
}

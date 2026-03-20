const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser() {
    try {
        const passwordHash = await bcrypt.hash('Pradeep@123', 10);
        
        const user = await prisma.user.create({
            data: {
                email: 'pradeep@gmail.com',
                passwordHash: passwordHash,
                name: 'Pradeep'
            }
        });
        
        console.log('User created successfully!');
        console.log('Email: pradeep@gmail.com');
        console.log('Password: Pradeep@123');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

createUser();

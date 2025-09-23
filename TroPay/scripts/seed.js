const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const { User, Wallet } = require('../src/models');

const seedData = async () => {
  try {
    // Connect to database
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Wallet.deleteMany({});

    console.log('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      phone: '0901234567',
      password: 'admin123',
      full_name: 'TroPay Administrator',
      email: 'admin@tropay.com',
      role: 'admin',
      is_phone_verified: true,
      is_email_verified: true,
      kyc_status: 'verified',
      is_active: true
    });

    // Create admin wallet
    await Wallet.create({
      user_id: adminUser._id,
      balance: 1000000000, // 1 billion VND
      currency: 'VND'
    });

    console.log('Admin user created:', adminUser.phone);

    // Create demo users
    const demoUsers = [
      {
        phone: '0987654321',
        password: 'user123',
        full_name: 'Nguyen Van A',
        email: 'user1@example.com',
        is_phone_verified: true
      },
      {
        phone: '0912345678',
        password: 'user123',
        full_name: 'Tran Thi B',
        email: 'user2@example.com',
        is_phone_verified: true
      },
      {
        phone: '0923456789',
        password: 'user123',
        full_name: 'Le Van C',
        email: 'user3@example.com',
        is_phone_verified: false
      }
    ];

    for (const userData of demoUsers) {
      const user = await User.create(userData);
      
      // Create wallet for each user
      await Wallet.create({
        user_id: user._id,
        balance: Math.floor(Math.random() * 10000000), // Random balance up to 10M VND
        currency: 'VND'
      });

      console.log('Demo user created:', user.phone);
    }

    console.log('✅ Seed data created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
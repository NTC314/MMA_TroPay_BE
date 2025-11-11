const { ServiceType } = require('../models');

const seedServiceTypes = async () => {
  try {
    // Check if service types already exist
    const existingCount = await ServiceType.countDocuments();
    if (existingCount > 0) {
      console.log('Service types already seeded');
      return;
    }

    // Default service types
    const serviceTypes = [
      {
        code: 'electric',
        name: 'Điện',
        unit: 'kWh',
        description: 'Dịch vụ điện'
      },
      {
        code: 'water',
        name: 'Nước',
        unit: 'm³',
        description: 'Dịch vụ nước'
      },
      {
        code: 'internet',
        name: 'Internet',
        unit: 'tháng',
        description: 'Dịch vụ internet'
      },
      {
        code: 'garbage',
        name: 'Rác',
        unit: 'tháng',
        description: 'Dịch vụ thu gom rác'
      },
      {
        code: 'parking',
        name: 'Gửi xe',
        unit: 'tháng',
        description: 'Dịch vụ gửi xe'
      },
      {
        code: 'cleaning',
        name: 'Vệ sinh',
        unit: 'tháng',
        description: 'Dịch vụ vệ sinh chung'
      },
      {
        code: 'security',
        name: 'Bảo vệ',
        unit: 'tháng',
        description: 'Dịch vụ bảo vệ'
      }
    ];

    await ServiceType.insertMany(serviceTypes);
    console.log('Service types seeded successfully');
  } catch (error) {
    console.error('Error seeding service types:', error);
    throw error;
  }
};

module.exports = { seedServiceTypes };
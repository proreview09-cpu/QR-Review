require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Setting = require('./models/Setting');
const ActivityLog = require('./models/ActivityLog');

async function seed() {
  await connectDB();

  const adminExists = await User.findOne({ email: 'pro.review09@gmail.com' });
  if (!adminExists) {
    await User.create({
      name: 'Admin',
      email: 'pro.review09@gmail.com',
      password: '09.Pro_review',
      role: 'admin',
    });
    console.log('Admin created: pro.review09@gmail.com / 09.Pro_review');
  } else {
    // Update password if admin exists with old password
    adminExists.password = '09.Pro_review';
    await adminExists.save();
    console.log('Admin password updated: pro.review09@gmail.com / 09.Pro_review');
  }

  const apiKeyExists = await Setting.findOne({ key: 'openaiApiKey' });
  if (!apiKeyExists) {
    await Setting.create({ key: 'openaiApiKey', value: '' });
  }

  const providersExist = await Setting.findOne({ key: 'aiProviders' });
  if (!providersExist) {
    await Setting.create({ key: 'aiProviders', value: [] });
  }

  const toneExists = await Setting.findOne({ key: 'defaultTone' });
  if (!toneExists) {
    await Setting.create({ key: 'defaultTone', value: 'friendly' });
  }

  const langExists = await Setting.findOne({ key: 'defaultLanguage' });
  if (!langExists) {
    await Setting.create({ key: 'defaultLanguage', value: 'english' });
  }

  const promptExists = await Setting.findOne({ key: 'generalReviewPrompt' });
  if (!promptExists) {
    await Setting.create({ key: 'generalReviewPrompt', value: '' });
  }

  await ActivityLog.create({
    action: 'SEED',
    entity: 'system',
    description: 'Database seeded with admin user',
    performedBy: 'system',
  });

  console.log('Seed complete');
  process.exit(0);
}

seed();

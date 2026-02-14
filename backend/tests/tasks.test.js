import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import User from '../models/User.js';
import Task from '../models/Task.js';

let app;
let mongoServer;

const createUserAndToken = async (overrides = {}) => {
  const payload = {
    name: 'Task User',
    email: 'tasker@example.com',
    password: 'password123',
    ...overrides,
  };

  const response = await request(app).post('/api/auth/register').send(payload);
  return response.body.token;
};

before(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRE = '15m';
  process.env.REFRESH_TOKEN_DAYS = '7';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);

  app = createApp().app;
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany();
  await Task.deleteMany();
});

describe('Tasks API', () => {
  it('creates a task for authenticated user', async () => {
    const token = await createUserAndToken();

    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ship release', priority: 'high' })
      .expect(201);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.title, 'Ship release');
  });

  it('filters tasks by status', async () => {
    const token = await createUserAndToken();

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Draft plan', status: 'todo' });

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Build feature', status: 'in-progress' });

    const response = await request(app)
      .get('/api/tasks?status=todo')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].status, 'todo');
  });
});

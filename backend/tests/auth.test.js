import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import User from '../models/User.js';

let app;
let mongoServer;

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
});

describe('Auth API', () => {
  it('registers a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Demo User', email: 'demo@example.com', password: 'password123' })
      .expect(201);

    assert.equal(response.body.success, true);
    assert.ok(response.body.token);
    assert.equal(response.body.user.email, 'demo@example.com');
  });

  it('logs in a user and sets refresh cookie', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Login User', email: 'login@example.com', password: 'password123' })
      .expect(201);

    const agent = request.agent(app);
    const response = await agent
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);

    assert.ok(response.body.token);
    assert.ok(response.headers['set-cookie']);
  });

  it('refreshes access token using cookie', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .send({ name: 'Refresh User', email: 'refresh@example.com', password: 'password123' })
      .expect(201);

    const refreshResponse = await agent.post('/api/auth/refresh').expect(200);
    assert.ok(refreshResponse.body.token);
    assert.equal(refreshResponse.body.user.email, 'refresh@example.com');
  });
});

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const redisClient = require('../redisClient');

const CACHE_KEY = 'all_users';

// GET all users with Redis caching
router.get('/users', async (req, res) => {
  try {
    const cachedUsers = await redisClient.get(CACHE_KEY);
    if (cachedUsers) {
      console.log('Serving from Redis cache');
      return res.json(JSON.parse(cachedUsers));
    }

    const users = await User.find();

    await redisClient.setEx(CACHE_KEY, 60, JSON.stringify(users)); // cache expires after 60 seconds

    console.log('Serving from DB');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create user + invalidate cache
router.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();

    await redisClient.del(CACHE_KEY); // invalidate cache

    res.status(201).json(savedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update user + invalidate cache
router.put('/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });

    await redisClient.del(CACHE_KEY);

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user + invalidate cache
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);

    await redisClient.del(CACHE_KEY);

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

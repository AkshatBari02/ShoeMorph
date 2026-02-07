import { AuthenticationError } from 'apollo-server-express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyToken = (token) => {
  if (!token) return null;
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
};

export const auth = async (context) => {
  const authHeader = context.req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    throw new AuthenticationError('Unauthenticated, no token!');
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new AuthenticationError('Unauthenticated, no token');
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) {
      throw new AuthenticationError('User not found');
    }
    return user;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Invalid or expired token');
  }
};

export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

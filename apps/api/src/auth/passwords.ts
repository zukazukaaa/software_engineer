import bcrypt from 'bcryptjs';

const COST_FACTOR = 12;

export const hashPassword = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, COST_FACTOR);
};

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};

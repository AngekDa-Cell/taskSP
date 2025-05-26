import { NextApiRequest, NextApiResponse } from 'next';
import getPgPool from '@/lib/pgPool'; // Assuming pgPool.ts is in src/lib

const registerHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Basic validation (you might want more robust validation)
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const pool = getPgPool();
  const client = await pool.connect();

  try {
    // Call SP_RegisterUser
    // p_Username VARCHAR(255), p_Password VARCHAR(255), OUT o_NewUserID INT
    const spCallQuery = 'CALL SP_RegisterUser($1, $2, NULL)'; 
    const spCallValues = [username, password];

    const result = await client.query(spCallQuery, spCallValues);
    const newUser = result.rows[0];

    if (!newUser || newUser.o_newuserid === null) {
      return res.status(400).json({ error: 'Failed to register user' });
    }

    res.status(201).json({
      userId: newUser.o_newuserid,
    });
  } catch (error: any) {
    console.error('Registration API error:', error);
    // Check for unique violation error (PostgreSQL error code 23505 for unique_violation)
    if (error.code === '23505') {
      res.status(409).json({ error: 'Username already exists' }); // 409 Conflict
    } else {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  } finally {
    client.release();
  }
};

export default registerHandler;
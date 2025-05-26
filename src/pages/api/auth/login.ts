import { NextApiRequest, NextApiResponse } from 'next';
import getPgPool from '@/lib/pgPool';

const loginHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const pool = getPgPool();

  try {
    const client = await pool.connect();
    console.log('Connected to the database');

    // Actualizar la consulta para usar UserID y PasswordHash
    const query = `
      SELECT UserID AS id, Username AS username
      FROM Users
      WHERE Username = $1 AND PasswordHash = encode(digest($2, 'sha256'), 'hex')
    `;
    const values = [username, password];
    console.log('Executing query:', query, 'with values:', values);

    const result = await client.query(query, values);
    console.log('Query result:', result.rows);

    client.release();

    if (result.rows.length === 0) {
      console.warn('No user found with the provided credentials');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    console.log('Authenticated user:', user);
    return res.status(200).json(user);
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default loginHandler;

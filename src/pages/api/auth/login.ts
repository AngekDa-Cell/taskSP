import { NextApiRequest, NextApiResponse } from 'next';
import getPgPool from '@/lib/pgPool';

const loginHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const pool = getPgPool();
  const client = await pool.connect();

  try {
    // Call SP_AuthenticateUser
    // p_Username VARCHAR(255), p_Password VARCHAR(255), OUT o_UserID INT, OUT o_Username_Out VARCHAR(255)
    const spCallQuery = 'CALL SP_AuthenticateUser($1, $2, NULL, NULL)'; 
    const spCallValues = [username, password];

    const result = await client.query(spCallQuery, spCallValues);

    const user = result.rows[0];

    if (!user || user.o_userid === null) { 
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.status(200).json({
      id: user.o_userid,
      username: user.o_username_out, 
    });
  } catch (error: any) {
    console.error('Login API error:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    client.release();
  }
};

export default loginHandler;

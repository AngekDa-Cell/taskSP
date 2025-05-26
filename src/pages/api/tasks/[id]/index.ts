import { NextApiRequest, NextApiResponse } from 'next';
import getPgPool from '@/lib/pgPool';

const taskDetailHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pool = getPgPool();

  try {
    const { id } = req.query;
    const userId = req.headers['x-user-id'];

    if (!id || !userId) {
      return res.status(400).json({ error: 'Task ID and User ID are required' });
    }

    const client = await pool.connect();
    const query = 'SELECT * FROM FN_GetTaskDetails($1, $2)';
    const values = [id, userId];

    const result = await client.query(query, values);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default taskDetailHandler;

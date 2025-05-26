import { NextApiRequest, NextApiResponse } from 'next';
import getPgPool from '@/lib/pgPool';

const tasksHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pool = getPgPool();

  try {
    if (req.method === 'GET') {
      const { userId, date } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const client = await pool.connect();

      const query = date
        ? 'SELECT * FROM FN_GetTasksForUserByDate($1, $2)'
        : 'SELECT * FROM FN_GetTasksForUserByDate($1, NULL)';
      const values = date ? [userId, date] : [userId];

      const result = await client.query(query, values);
      client.release();

      return res.status(200).json(result.rows);
    } else if (req.method === 'POST') {
      const { userId, title, description, dueDate } = req.body;

      if (!userId || !title || !dueDate) {
        return res.status(400).json({ error: 'User ID, title, and due date are required' });
      }

      const client = await pool.connect();
      const query = 'SELECT FN_CreateTask($1, $2, $3, $4) AS TaskID';
      const values = [userId, title, description || null, dueDate];

      const result = await client.query(query, values);
      client.release();

      if (result.rows.length === 0 || !result.rows[0].taskid) {
        return res.status(500).json({ error: 'Failed to create task' });
      }

      return res.status(201).json({ taskId: result.rows[0].taskid });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default tasksHandler;

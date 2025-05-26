import { NextApiRequest, NextApiResponse } from 'next';
import getPgPool from '@/lib/pgPool'; // Assuming pgPool.ts is in src/lib
import { Task } from '@/lib/types'; // Assuming Task type is defined

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pool = getPgPool();

  if (req.method === 'GET') {
    const userId = req.query.userId as string;
    const targetDate = req.query.date as string | undefined; // Expects 'YYYY-MM-DD' or undefined

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({ error: 'Valid User ID is required as a query parameter.' });
    }

    const client = await pool.connect();
    // Using a more robust unique cursor name generation strategy if needed, but for per-request, timestamp is often sufficient.
    const cursorName = `tasks_cursor_${userId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    try {
      await client.query('BEGIN');
      // CALL SP_GetTasksForUserByDate(p_UserID INT, p_TargetDate DATE, INOUT p_TasksCursor REFCURSOR)
      const spCallQuery = 'CALL SP_GetTasksForUserByDate($1, $2, $3)';
      const spCallValues = [parseInt(userId), targetDate || null, cursorName];

      await client.query(spCallQuery, spCallValues);
      const tasksResult = await client.query(`FETCH ALL IN "${cursorName}"`);
      // The SP_GetTasksForUserByDate returns columns: TaskID, UserID, Title, Description, CreationDate, DueDate, Status
      // Map these to the Task type
      const tasks: Task[] = tasksResult.rows.map(row => ({
        id: row.taskid, 
        userId: row.userid,
        title: row.title,
        description: row.description,
        creationDate: row.creationdate.toISOString(),
        dueDate: row.duedate ? new Date(row.duedate).toISOString().split('T')[0] : '',
        status: row.status,
      }));

      await client.query(`CLOSE "${cursorName}"`); // Close the cursor
      await client.query('COMMIT');

      res.status(200).json(tasks);
    } catch (error: any) {
      console.error('API Error fetching tasks:', error);
      // Ensure rollback and release on error
      try {
        await client.query('ROLLBACK');
      } catch (rbError) {
        console.error('Rollback error:', rbError);
      }
      return res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
    } finally {
      if (client) client.release();
    }
  } else if (req.method === 'POST') {
    const { userId, title, description, dueDate } = req.body;

    if (!userId || isNaN(parseInt(userId)) || !title || !dueDate) {
      return res.status(400).json({ error: 'UserID, title, and due date are required.' });
    }

    const client = await pool.connect();
    try {
      // CALL SP_CreateTask(p_UserID INT, p_Title VARCHAR, p_Description TEXT, p_DueDate DATE, OUT o_NewTaskID INT)
      const spCallQuery = 'CALL SP_CreateTask($1, $2, $3, $4, NULL)';
      const spCallValues = [parseInt(userId), title, description, dueDate];

      const result = await client.query(spCallQuery, spCallValues);
      const newTaskData = result.rows[0];

      if (!newTaskData || newTaskData.o_newtaskid === null) {
        return res.status(500).json({ error: 'Failed to create task' });
      }

      // Fetch the newly created task details to return the full task object
      // This assumes you have a way to get task details, e.g., another SP or direct query
      // For simplicity, we'll use SP_GetTaskDetails if available and appropriate
      // Or, construct the task object from available data if the SP_CreateTask could return more.
      // Given SP_CreateTask only returns o_NewTaskID, we need to fetch.
      
      const spGetQuery = 'CALL SP_GetTaskDetails($1, $2, NULL, NULL, NULL, NULL, NULL, NULL)';
      const spGetValues = [newTaskData.o_newtaskid, parseInt(userId)];
      const getResult = await client.query(spGetQuery, spGetValues);
      const createdTaskData = getResult.rows[0];

      if (!createdTaskData || createdTaskData.o_fetched_taskid === null) {
        // This would be an inconsistency, but handle it.
        return res.status(500).json({ error: 'Failed to retrieve created task details' });
      }

      const newTask: Task = {
        id: createdTaskData.o_fetched_taskid,
        userId: parseInt(userId),
        title: createdTaskData.o_title,
        description: createdTaskData.o_description,
        creationDate: createdTaskData.o_creationdate.toISOString(),
        dueDate: createdTaskData.o_duedate ? new Date(createdTaskData.o_duedate).toISOString().split('T')[0] : '',
        status: createdTaskData.o_status, // Should be 'pending' by default from SP/Table
      };

      res.status(201).json(newTask);
    } catch (error: any) {
      console.error('API Error creating task:', error);
      return res.status(500).json({ error: 'Failed to create task', details: error.message });
    } finally {
      if (client) client.release();
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

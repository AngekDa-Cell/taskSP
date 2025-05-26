import { NextApiRequest, NextApiResponse } from 'next';
import getPgPool from '@/lib/pgPool';
import { Task, TaskStatus } from '@/lib/types'; // Import Task type

const taskDetailHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const pool = getPgPool();
  const client = await pool.connect(); // Connect once

  try {
    const { id } = req.query;
    const userId = req.headers['x-user-id'];

    if (!id || !userId) {
      // client.release(); // Release moved to finally block
      return res.status(400).json({ error: 'Task ID and User ID are required' });
    }

    const taskIdNumeric = parseInt(id as string);
    const userIdNumeric = parseInt(userId as string);

    if (isNaN(taskIdNumeric) || isNaN(userIdNumeric)) {
      // client.release(); // Release moved to finally block
      return res.status(400).json({ error: 'Task ID and User ID must be numbers' });
    }

    if (req.method === 'GET') {
      // SP_GetTaskDetails(p_TaskID_in INT, p_UserID_in INT, OUT o_Fetched_TaskID INT, OUT o_Title VARCHAR(255), OUT o_Description TEXT, OUT o_CreationDate TIMESTAMP, OUT o_DueDate DATE, OUT o_Status task_status_enum)
      const spCallQuery = 'CALL SP_GetTaskDetails($1, $2, NULL, NULL, NULL, NULL, NULL, NULL)';
      const spCallValues = [taskIdNumeric, userIdNumeric];

      const result = await client.query(spCallQuery, spCallValues);
      const taskData = result.rows[0];

      if (!taskData || taskData.o_fetched_taskid === null) {
        // client.release(); // Release moved to finally block
        return res.status(404).json({ error: 'Task not found or not authorized' });
      }

      const task: Task = {
        id: taskData.o_fetched_taskid,
        userId: userIdNumeric, // The SP ensures this task belongs to the user
        title: taskData.o_title,
        description: taskData.o_description,
        creationDate: taskData.o_creationdate.toISOString(),
        dueDate: taskData.o_duedate ? new Date(taskData.o_duedate).toISOString().split('T')[0] : '',
        status: taskData.o_status,
      };
      res.status(200).json(task);
    } else if (req.method === 'DELETE') {
      // SP_DeleteTask(p_TaskID INT, p_UserID INT, OUT o_deleted_rows_count INT)
      const spCallQuery = 'CALL SP_DeleteTask($1, $2, NULL)';
      const result = await client.query(spCallQuery, [taskIdNumeric, userIdNumeric]);
      
      const deletedCount = result.rows[0]?.o_deleted_rows_count;
      if (deletedCount > 0) {
        res.status(204).end(); // No Content
      } else {
        res.status(404).json({ error: 'Task not found or not authorized to delete' });
      }
    } else if (req.method === 'PATCH') {
      const { title, description, dueDate, status } = req.body as { title?: string, description?: string, dueDate?: string, status?: TaskStatus };

      // SP_UpdateTask(p_TaskID INT, p_UserID INT, p_Title VARCHAR(255), p_Description TEXT, p_DueDate DATE, p_Status task_status_enum, OUT o_updated_rows_count INT)
      // We pass NULL for fields not provided, COALESCE in SP handles it.
      const spUpdateQuery = 'CALL SP_UpdateTask($1, $2, $3, $4, $5, $6, NULL)';
      const spUpdateValues = [taskIdNumeric, userIdNumeric, title, description, dueDate, status];
      
      const updateResult = await client.query(spUpdateQuery, spUpdateValues);
      const updatedCount = updateResult.rows[0]?.o_updated_rows_count;

      if (updatedCount > 0) {
        // Fetch the updated task to return it
        const spGetQuery = 'CALL SP_GetTaskDetails($1, $2, NULL, NULL, NULL, NULL, NULL, NULL)';
        const spGetValues = [taskIdNumeric, userIdNumeric];
        const getResult = await client.query(spGetQuery, spGetValues);
        const taskData = getResult.rows[0];

        if (!taskData || taskData.o_fetched_taskid === null) {
          // Should not happen if update was successful, but as a safeguard
          return res.status(404).json({ error: 'Updated task not found' });
        }
        const updatedTask: Task = {
          id: taskData.o_fetched_taskid,
          userId: userIdNumeric,
          title: taskData.o_title,
          description: taskData.o_description,
          creationDate: taskData.o_creationdate.toISOString(),
          dueDate: taskData.o_duedate ? new Date(taskData.o_duedate).toISOString().split('T')[0] : '',
          status: taskData.o_status,
        };
        res.status(200).json(updatedTask);
      } else {
        res.status(404).json({ error: 'Task not found, not authorized to update, or no changes made' });
      }
    } else {
      res.setHeader('Allow', ['GET', 'DELETE', 'PATCH']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error processing task request:', error.message, error.stack);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    if (client) client.release(); // Ensure client is always released
  }
};

export default taskDetailHandler;

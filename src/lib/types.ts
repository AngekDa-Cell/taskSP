export type User = {
  id: number;
  username: string;
};

export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export type Task = {
  id: number;
  userId: number;
  title: string;
  description?: string;
  creationDate: string; // ISO string date
  dueDate: string; // YYYY-MM-DD string date
  status: TaskStatus;
};
